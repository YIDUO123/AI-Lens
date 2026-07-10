'use server';

/**
 * 洞察长文 · CRUD Server Actions
 * 只允许 admin / editor 操作
 */
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, articles } from '@/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

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
  revalidatePath('/admin/insights');
  revalidatePath(`/admin/insights/${id}`);
}

// ============================================================
// 发布(草稿 → 正式) · 同步刷新公开路径 slug
// ============================================================
export async function publishInsight(id: string): Promise<void> {
  await requireEditor();
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

  revalidatePath('/insights');
  revalidatePath(`/insights/${finalSlug}`);
  revalidatePath('/admin/insights');
}

// ============================================================
// 撤回到草稿
// ============================================================
export async function unpublishInsight(id: string): Promise<void> {
  await requireEditor();
  await db
    .update(articles)
    .set({ isDraft: true, updatedAt: new Date() })
    .where(eq(articles.id, id));
  revalidatePath('/insights');
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
