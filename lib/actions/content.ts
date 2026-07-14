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
export async function fetchOgMetadata(url: string): Promise<{
  title: string;
  description: string;
  image: string;
  siteName: string;
  author: string;
  body: string;   // 抓到的正文 markdown · 走 Jina Reader · 失败则给空
}> {
  await requireEditor();
  if (!/^https?:\/\//i.test(url)) throw new Error('URL 必须以 http(s) 开头');

  // 并行发两个请求:
  //   1. 原始 HTML · 解 OG 元数据(标题/摘要/封面)
  //   2. Jina Reader · 提取干净的正文 markdown(免费 · 无需 key)
  const [ogRes, bodyRes] = await Promise.allSettled([
    fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Lens/2.0; +https://ailens.cloud)' },
      signal: AbortSignal.timeout(15000),
    }),
    fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain', 'X-With-Generated-Alt': 'true' },
      signal: AbortSignal.timeout(20000),
    }),
  ]);

  if (ogRes.status !== 'fulfilled' || !ogRes.value.ok) {
    throw new Error('抓取失败:目标网站没响应 · 可能被防抓取 · 换个链接试试');
  }
  const html = await ogRes.value.text();

  // 极简 OG / meta 解析
  const pick = (re: RegExp): string => {
    const m = html.match(re);
    return (m?.[1] || '').trim().slice(0, 500);
  };
  const title =
    pick(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
    pick(/<title>([^<]+)<\/title>/i);
  const description =
    pick(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i);
  const image =
    pick(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
  const siteName =
    pick(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i) ||
    new URL(url).hostname.replace(/^www\./, '');
  const author =
    pick(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
    pick(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i);

  // 正文(Jina Reader 返回 markdown · 直接可用)
  let body = '';
  if (bodyRes.status === 'fulfilled' && bodyRes.value.ok) {
    const raw = await bodyRes.value.text();
    // Jina 返回格式:开头有 "Title: xxx\nURL: xxx\n\n" 元数据 · 我们剥掉
    body = raw
      .replace(/^Title:\s*.+?\nURL Source:\s*.+?\n(?:Published Time:.*?\n)?(?:Markdown Content:\s*\n)?/is, '')
      .trim()
      .slice(0, 20000); // 20k 字符上限 · 太长的文章截断
  }

  return {
    title: unescapeHtml(title || '无标题'),
    description: unescapeHtml(description),
    image,
    siteName: unescapeHtml(siteName),
    author: unescapeHtml(author),
    body,
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
