'use server';

/**
 * 洞察长文 · CRUD Server Actions
 * 只允许 admin / editor 操作
 */
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, articles } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath, revalidateTag } from 'next/cache';
import { generateWithAI } from '@/lib/ai/gemini';
import { logEvent } from '@/lib/analytics/log';

async function requireEditor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('未登录');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') throw new Error('无权限');
  return session.user;
}

// 中文 slug 转 pinyin-like 简化版 · 生成随机短 slug 兜底
function makeSlug(title: string): string {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  // 中文字符去掉后如果剩下太短,加个短 id
  const asciiOnly = clean.replace(/[一-龥]/g, '');
  if (asciiOnly.length < 5) {
    return 'insight-' + nanoid(8).toLowerCase();
  }
  return asciiOnly.replace(/^-+|-+$/g, '') + '-' + nanoid(5).toLowerCase();
}

// ============================================================
// 新建草稿 · 返回 id 用于跳转
// ============================================================
export async function createInsightDraft(): Promise<{ id: string }> {
  const user = await requireEditor();
  const id = nanoid();
  const slug = 'draft-' + nanoid(8).toLowerCase();

  await db.insert(articles).values({
    id,
    slug,
    title: '未命名草稿',
    category: 'thinking',
    excerpt: '',
    cover: '',
    body: '# 开始写你的洞察长文\n\n在左侧写 markdown · 右侧实时预览。\n\n## 常用语法\n\n- **加粗** · *斜体* · [链接](https://example.com)\n- `行内代码` · > 引用\n- 图片:`![描述](图片URL)`\n\n开始吧 ✍️\n',
    authorId: user.id,
    authorName: user.name || 'AI Lens 编辑部',
    readTime: 5,
    isDraft: true,
  });

  return { id };
}

// ============================================================
// 更新草稿字段
// ============================================================
export async function updateInsight(
  id: string,
  patch: {
    title?: string;
    category?: string;
    excerpt?: string;
    cover?: string;
    body?: string;
    readTime?: number;
    featured?: boolean;
  },
): Promise<void> {
  await requireEditor();
  await db
    .update(articles)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(articles.id, id));

  // 拿到 slug 用于 revalidate 公开详情页
  const [row] = await db.select({ slug: articles.slug, isDraft: articles.isDraft }).from(articles).where(eq(articles.id, id)).limit(1);

  // 3 层缓存全清
  revalidateTag('articles');                // unstable_cache tag(getArticleBySlug 等)
  revalidatePath('/admin/insights');
  revalidatePath(`/admin/insights/${id}`);
  if (row && !row.isDraft) {
    revalidatePath('/insights');
    revalidatePath(`/insights/${row.slug}`);
  }
}

// ============================================================
// 发布(草稿 → 正式) · 同步刷新公开路径 slug
// ============================================================
export async function publishInsight(id: string, patch?: Parameters<typeof updateInsight>[1]): Promise<void> {
  const user = await requireEditor();

  // 允许同时接受 patch · 省一次 round trip
  if (patch) {
    await db
      .update(articles)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(articles.id, id));
  }

  const [row] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!row) throw new Error('文章不存在');
  if (!row.title?.trim() || row.title === '未命名草稿') throw new Error('请先填标题');
  if (!row.body?.trim() || row.body.length < 20) throw new Error('正文太短(至少 20 字)');

  // slug 还是 draft- 开头就重生成
  let finalSlug = row.slug;
  if (finalSlug.startsWith('draft-')) {
    finalSlug = makeSlug(row.title);
  }

  await db
    .update(articles)
    .set({
      slug: finalSlug,
      isDraft: false,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id));

  // 3 层缓存全清
  revalidateTag('articles');
  revalidatePath('/insights');
  revalidatePath(`/insights/${finalSlug}`);
  revalidatePath('/admin/insights');
  revalidatePath(`/admin/insights/${id}`);

  // 埋点 · 发布事件
  logEvent('editor_publish', {
    type: 'article',
    slug: finalSlug,
    category: row.category,
    body_length: row.body?.length || 0,
  }, { userId: user.id, path: `/admin/insights/${id}` });
}

// ============================================================
// 撤回到草稿
// ============================================================
export async function unpublishInsight(id: string): Promise<void> {
  await requireEditor();
  const [row] = await db.select({ slug: articles.slug }).from(articles).where(eq(articles.id, id)).limit(1);
  await db
    .update(articles)
    .set({ isDraft: true, updatedAt: new Date() })
    .where(eq(articles.id, id));
  revalidateTag('articles');
  revalidatePath('/insights');
  if (row) revalidatePath(`/insights/${row.slug}`);
  revalidatePath('/admin/insights');
}

// ============================================================
// 删除
// ============================================================
export async function deleteInsight(id: string): Promise<void> {
  await requireEditor();
  await db.delete(articles).where(eq(articles.id, id));
  revalidatePath('/insights');
  revalidatePath('/admin/insights');
}

/** 批量删除洞察 · admin 快速清理 */
export async function bulkDeleteInsights(ids: string[]): Promise<{ deleted: number }> {
  await requireEditor();
  if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };
  const cleanIds = ids.filter((x) => typeof x === 'string' && x.length > 0).slice(0, 200);
  await db.delete(articles).where(inArray(articles.id, cleanIds));
  revalidatePath('/insights');
  revalidatePath('/admin/insights');
  return { deleted: cleanIds.length };
}

// ============================================================
// AI 润色 · 传入一段选中的文字 · 返回润色后的版本
// ============================================================
export async function polishText(input: string): Promise<{ polished: string }> {
  await requireEditor();
  const clean = (input || '').trim();
  if (!clean) throw new Error('没有可润色的内容');
  if (clean.length > 3000) throw new Error('一次最多润色 3000 字');

  const prompt = `你是资深中文编辑,擅长把粗糙的初稿改得更专业、更清晰、更有节奏。请润色下面这段文字。

要求:
1. 保留原意 · 不添加新观点 · 不删除关键信息
2. 让句子更简洁 · 主动句代替被动句 · 去掉废话
3. 保留原有的 Markdown 语法(粗体 · 链接 · 列表等)
4. 输出严格的 JSON · 不要 markdown 代码块包裹

原文:
"""
${clean}
"""

请输出:
{ "polished": "润色后的文字" }`;

  const raw = await generateWithAI(prompt, { temperature: 0.5, maxTokens: 3000, useCase: 'polish_insight' });
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    if (!parsed.polished) throw new Error('AI 没返回 polished 字段');
    return { polished: String(parsed.polished) };
  } catch {
    // AI 有时不听话直接返回纯文字,兜底
    return { polished: raw.trim().replace(/^["']|["']$/g, '') };
  }
}

// ============================================================
// AI 一键生成摘要 · 从正文提炼 60-100 字 excerpt
// ============================================================
export async function generateExcerptFromBody(id: string): Promise<{ excerpt: string }> {
  await requireEditor();
  const [row] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!row) throw new Error('文章不存在');
  if (!row.body || row.body.length < 50) throw new Error('正文太短(至少 50 字才能生成摘要)');

  // 只取前 3000 字给 AI 看 · 省 token
  const bodyForAI = row.body.slice(0, 3000);

  const prompt = `你是资深内容编辑。请为下面这篇 AI 主题的洞察长文写一段 60-100 字的中文摘要,用作首页/列表页的展示文案。

标题:${row.title}
分类:${row.category}

正文(节选):
"""
${bodyForAI}
"""

要求:
1. 60-100 字 · 单段 · 不要分段
2. 陈述文章的核心观点或结论 · 不要"本文将..."这种废话开头
3. 有钩子感 · 让读者想点开看
4. 严格输出 JSON:{ "excerpt": "摘要文字" }`;

  const raw = await generateWithAI(prompt, { temperature: 0.6, maxTokens: 500, useCase: 'excerpt_generate' });
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    if (!parsed.excerpt) throw new Error('AI 没返回 excerpt');
    const excerpt = String(parsed.excerpt).trim();
    // 顺手写回 DB
    await db.update(articles).set({ excerpt, updatedAt: new Date() }).where(eq(articles.id, id));
    return { excerpt };
  } catch {
    const excerpt = raw.trim().replace(/^["']|["']$/g, '').slice(0, 200);
    await db.update(articles).set({ excerpt, updatedAt: new Date() }).where(eq(articles.id, id));
    return { excerpt };
  }
}
