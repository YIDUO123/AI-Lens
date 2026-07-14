'use server';

/**
 * 产品拆解 · CRUD Server Actions
 * 结构和 insights 高度相似 · 差异:分类是 chat/coding/creative/enterprise/domestic
 * 拆解没有 draft 概念 · 一发布就上线(未来可加 isDraft)
 */
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, teardowns } from '@/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { generateWithAI } from '@/lib/ai/gemini';

async function requireEditor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('未登录');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') throw new Error('无权限');
  return session.user;
}

function makeSlug(title: string): string {
  const asciiPart = title
    .toLowerCase()
    .replace(/[一-龥]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  if (asciiPart.length < 3) return 'teardown-' + nanoid(8).toLowerCase();
  return asciiPart + '-' + nanoid(5).toLowerCase();
}

// ============================================================
// 新建拆解 · 空模板
// ============================================================
export async function createTeardownDraft(): Promise<{ id: string }> {
  const user = await requireEditor();
  const id = nanoid();
  const slug = 'draft-' + nanoid(8).toLowerCase();

  await db.insert(teardowns).values({
    id,
    slug,
    title: '未命名拆解',
    category: 'chat',
    positioning: '',
    cover: '',
    body: '# 产品拆解模板\n\n## 定位\n\n(这个产品在赛道里占什么位置?)\n\n## 目标用户\n\n(谁在用?典型场景是什么?)\n\n## 核心能力\n\n- 能力 1\n- 能力 2\n\n## 商业模式\n\n(免费/订阅/API 计费?)\n\n## 亮点与争议\n\n**亮点:**\n\n**争议:**\n\n## AI Lens 编辑视角\n\n(你自己的判断)\n',
    productUrl: '',
    authorId: user.id,
    authorName: user.name || 'AI Lens 编辑部',
    readTime: 8,
    isDomestic: false,
  });

  return { id };
}

// ============================================================
// 更新字段
// ============================================================
export async function updateTeardown(
  id: string,
  patch: {
    title?: string;
    category?: string;
    positioning?: string;
    cover?: string;
    body?: string;
    productUrl?: string;
    readTime?: number;
    isDomestic?: boolean;
  },
): Promise<void> {
  await requireEditor();
  await db.update(teardowns).set({ ...patch, updatedAt: new Date() }).where(eq(teardowns.id, id));
  revalidatePath('/admin/teardowns');
  revalidatePath(`/admin/teardowns/${id}`);
}

// ============================================================
// 发布(slug 生成 + publishedAt 更新)
// ============================================================
export async function publishTeardown(id: string, patch?: Parameters<typeof updateTeardown>[1]): Promise<void> {
  await requireEditor();
  if (patch) {
    await db.update(teardowns).set({ ...patch, updatedAt: new Date() }).where(eq(teardowns.id, id));
  }

  const [row] = await db.select().from(teardowns).where(eq(teardowns.id, id)).limit(1);
  if (!row) throw new Error('拆解不存在');
  if (!row.title?.trim() || row.title === '未命名拆解') throw new Error('请先填标题');
  if (!row.body?.trim() || row.body.length < 50) throw new Error('正文太短(至少 50 字)');

  let finalSlug = row.slug;
  if (finalSlug.startsWith('draft-')) {
    finalSlug = makeSlug(row.title);
  }

  await db.update(teardowns).set({
    slug: finalSlug,
    publishedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(teardowns.id, id));

  revalidatePath('/teardowns');
  revalidatePath(`/teardowns/${finalSlug}`);
  revalidatePath('/admin/teardowns');
}

// ============================================================
// 删除
// ============================================================
export async function deleteTeardown(id: string): Promise<void> {
  await requireEditor();
  await db.delete(teardowns).where(eq(teardowns.id, id));
  revalidatePath('/teardowns');
  revalidatePath('/admin/teardowns');
}

// ============================================================
// AI 润色 · 复用同个 AI 通道
// ============================================================
export async function polishTeardownText(input: string): Promise<{ polished: string }> {
  await requireEditor();
  const clean = (input || '').trim();
  if (!clean) throw new Error('没有可润色的内容');
  if (clean.length > 3000) throw new Error('一次最多润色 3000 字');

  const prompt = `你是资深产品分析师 · 请润色下面这段产品拆解文字 · 让它更专业 · 更有洞察感。

要求:
1. 保留原意 · 不添加新观点
2. 加强逻辑 · 让判断更清晰 · 用主动句
3. 保留 Markdown 语法
4. 输出严格 JSON

原文:
"""
${clean}
"""

请输出:
{ "polished": "润色后的文字" }`;

  const raw = await generateWithAI(prompt, { temperature: 0.5, maxTokens: 3000 });
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    if (!parsed.polished) throw new Error('AI 没返回 polished');
    return { polished: String(parsed.polished) };
  } catch {
    return { polished: raw.trim().replace(/^["']|["']$/g, '') };
  }
}
