'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, articles, dailyPicks } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generatePickAnalysis } from '@/lib/ai/gemini';

async function requireEditor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('未登录');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') throw new Error('无权限');
  return session.user;
}

// ============================================================
// URL 采集 · 抓外部页面 OG 元数据
// ============================================================
/**
 * 抓取 URL 元数据 + 正文 · 永不抛错版
 * 返回 { ok: true, data: {...} } 或 { ok: false, error: '错误说明' }
 * 客户端根据 ok 分支处理 · 不会触发 RSC render 崩溃
 */
export async function fetchOgMetadata(url: string): Promise<
  | { ok: true; data: { title: string; description: string; image: string; siteName: string; author: string; body: string } }
  | { ok: false; error: string }
> {
  // ---------- 前置校验 ----------
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { ok: false, error: '未登录' };
    const role = (session.user as any).role || 'reader';
    if (role !== 'admin' && role !== 'editor') return { ok: false, error: '无权限' };
  } catch (e: any) {
    return { ok: false, error: '认证失败:' + (e?.message || 'unknown') };
  }

  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, error: 'URL 必须以 http(s) 开头' };
  }

  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  // ---------- 双通道并行抓取 · 每个都在 try 里独立 ----------
  const fetchHtml = async (): Promise<string> => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });
      if (!res.ok) return '';
      const text = await res.text();
      return text.slice(0, 500000); // 硬截到 500KB · 防 OOM
    } catch { return ''; }
  };

  const fetchJinaBody = async (): Promise<string> => {
    try {
      const res = await fetch(`https://r.jina.ai/${url}`, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) return '';
      const text = await res.text();
      // 头部元信息剥掉
      return text
        .replace(/^Title:\s*.+?\n(?:URL Source:\s*.+?\n)?(?:Published Time:.*?\n)?(?:Markdown Content:\s*\n)?/is, '')
        .trim()
        .slice(0, 8000); // 8k 字符上限 · 防 RSC payload 过大
    } catch { return ''; }
  };

  const [html, body] = await Promise.all([fetchHtml(), fetchJinaBody()]);

  // ---------- 解析 OG(所有异常兜住)----------
  let title = '', description = '', image = '', siteName = '', author = '';
  try {
    const pick = (re: RegExp): string => {
      const m = html.match(re);
      return (m?.[1] || '').trim().slice(0, 300);
    };
    title =
      pick(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      pick(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
      pick(/<title>([^<]+)<\/title>/i);
    description =
      pick(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      pick(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    image =
      pick(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
      pick(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    siteName = pick(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
    author =
      pick(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
      pick(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i);
  } catch {}

  // 域名兜底
  if (!siteName) {
    try { siteName = new URL(url).hostname.replace(/^www\./, ''); } catch { siteName = 'external'; }
  }

  // ---------- 判断成功与否 ----------
  if (!title && !body) {
    return {
      ok: false,
      error: '抓取失败 · 这个网站可能有反爬保护(CSDN / 微信 / 知乎常见)。请手动填写下方字段,或换 GitHub / Medium / Substack 等开放平台的链接。',
    };
  }

  // ---------- 成功返回 ----------
  return {
    ok: true,
    data: {
      title: unescapeHtml(title || '无标题').slice(0, 200),
      description: unescapeHtml(description).slice(0, 500),
      image: image.slice(0, 500),
      siteName: unescapeHtml(siteName).slice(0, 100),
      author: unescapeHtml(author).slice(0, 100),
      body,
    },
  };
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

// ============================================================
// 保存外部观点为 article(带 sourceUrl 标记)
// ============================================================
export async function saveExternalRef(input: {
  title: string;
  excerpt: string;
  body: string;                // 你的评注 markdown
  category: 'thinking' | 'hands-on' | 'method' | 'industry';
  sourceUrl: string;
  sourceName: string;
  sourceAuthor: string;
  sourceImage: string;
  readTime: number;
  isDraft: boolean;
}) {
  const user = await requireEditor();
  const slug = 'ref-' + nanoid(10).toLowerCase();

  await db.insert(articles).values({
    id: nanoid(),
    slug,
    title: input.title.slice(0, 200),
    category: input.category,
    excerpt: input.excerpt.slice(0, 500),
    body: input.body,
    authorId: user.id,
    authorName: user.name || 'AI Lens 编辑部',
    readTime: input.readTime,
    isDraft: input.isDraft,
    featured: false,
    sourceUrl: input.sourceUrl,
    sourceName: input.sourceName,
    sourceAuthor: input.sourceAuthor,
    sourceImage: input.sourceImage,
  });

  // 不再 revalidatePath · 客户端跳到详情页时自然拿最新 · 避免部分平台 RSC 崩溃
  return { slug };
}

// ============================================================
// 更新 daily pick 的 6 维分析
// ============================================================
export async function updateDailyPick(id: string, patch: Partial<{
  positioning: string;
  painPoint: string;
  solution: string;
  designHighlight: string;
  vibeCoding: string;
  commercial: string;
  consensus: string;
  criticism: string;
  editorTake: string;
  isDraft: boolean;
}>) {
  await requireEditor();
  await db.update(dailyPicks).set({
    ...patch,
    updatedAt: new Date(),
  }).where(eq(dailyPicks.id, id));
  revalidatePath('/teardowns');
  revalidatePath('/admin/picks');
  revalidatePath(`/admin/picks/${id}`);
  return { ok: true };
}

// ============================================================
// AI 兜底 · 让 Gemini 自动填 6 维
// ============================================================
export async function aiGenerateForPick(id: string) {
  await requireEditor();
  const [pick] = await db.select().from(dailyPicks).where(eq(dailyPicks.id, id)).limit(1);
  if (!pick) throw new Error('产品不存在');

  const analysis = await generatePickAnalysis({
    name: pick.name,
    url: pick.url,
    tagline: pick.tagline || '',
    category: pick.category,
  });

  await db.update(dailyPicks).set({
    positioning: analysis.positioning,
    painPoint: analysis.painPoint,
    solution: analysis.solution,
    designHighlight: analysis.designHighlight,
    vibeCoding: analysis.vibeCoding,
    commercial: analysis.commercial,
    consensus: analysis.consensus,
    criticism: analysis.criticism,
    editorTake: analysis.editorTake,
    updatedAt: new Date(),
  }).where(eq(dailyPicks.id, id));

  revalidatePath('/teardowns');
  revalidatePath('/admin/picks');
  revalidatePath(`/admin/picks/${id}`);
  return { ok: true, analysis };
}

// ============================================================
// 发布 / 撤回
// ============================================================
export async function publishPick(id: string) {
  await requireEditor();
  await db.update(dailyPicks).set({ isDraft: false, updatedAt: new Date() }).where(eq(dailyPicks.id, id));
  revalidatePath('/teardowns');
  revalidatePath('/admin/picks');
}

export async function unpublishPick(id: string) {
  await requireEditor();
  await db.update(dailyPicks).set({ isDraft: true, updatedAt: new Date() }).where(eq(dailyPicks.id, id));
  revalidatePath('/teardowns');
  revalidatePath('/admin/picks');
}

export async function deletePick(id: string) {
  await requireEditor();
  await db.delete(dailyPicks).where(eq(dailyPicks.id, id));
  revalidatePath('/teardowns');
  revalidatePath('/admin/picks');
}

/** 一键批量删除 · admin 快速清理老精选或抓错的条目 */
export async function bulkDeletePicks(ids: string[]) {
  await requireEditor();
  if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };
  const cleanIds = ids.filter((x) => typeof x === 'string' && x.length > 0).slice(0, 200);
  await db.delete(dailyPicks).where(inArray(dailyPicks.id, cleanIds));
  revalidatePath('/teardowns');
  revalidatePath('/admin/picks');
  return { deleted: cleanIds.length };
}
