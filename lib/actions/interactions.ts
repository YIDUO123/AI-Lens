'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, saves, likes, comments } from '@/db';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

export type TargetType = 'article' | 'teardown' | 'daily_pick' | 'news_item';

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('未登录');
  return session.user;
}

// ============================================================
// Saves · 收藏
// ============================================================
export async function toggleSave(targetType: TargetType, targetId: string) {
  const user = await requireUser();

  const existing = await db
    .select({ id: saves.id })
    .from(saves)
    .where(and(eq(saves.userId, user.id), eq(saves.targetType, targetType), eq(saves.targetId, targetId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(saves).where(eq(saves.id, existing[0].id));
  } else {
    await db.insert(saves).values({
      id: nanoid(),
      userId: user.id,
      targetType,
      targetId,
    });
  }

  revalidatePath('/me');
  return { saved: existing.length === 0 };
}

// ============================================================
// Likes · 点赞
// ============================================================
export async function toggleLike(targetType: TargetType, targetId: string) {
  const user = await requireUser();

  const existing = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.userId, user.id), eq(likes.targetType, targetType), eq(likes.targetId, targetId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(likes).where(eq(likes.id, existing[0].id));
  } else {
    await db.insert(likes).values({
      id: nanoid(),
      userId: user.id,
      targetType,
      targetId,
    });
  }

  revalidatePath('/me');
  return { liked: existing.length === 0 };
}

// ============================================================
// Comments · 评论
// ============================================================
export async function postComment(input: {
  targetType: TargetType;
  targetId: string;
  body: string;
  parentId?: string;
}) {
  const user = await requireUser();
  const body = input.body.trim();
  if (!body) throw new Error('评论内容不能为空');
  if (body.length > 2000) throw new Error('评论过长(最多 2000 字)');

  const id = nanoid();
  await db.insert(comments).values({
    id,
    userId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
    body,
    parentId: input.parentId || null,
  });

  revalidatePath('/insights/[slug]', 'page');
  revalidatePath('/teardowns/[slug]', 'page');
  return { id };
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const role = (user as any).role || 'reader';

  // 只有作者本人或管理员可以删
  const [c] = await db.select({ userId: comments.userId }).from(comments).where(eq(comments.id, commentId)).limit(1);
  if (!c) throw new Error('评论不存在');
  if (c.userId !== user.id && role !== 'admin') throw new Error('无权限删除');

  await db.delete(comments).where(eq(comments.id, commentId));
  revalidatePath('/insights/[slug]', 'page');
  revalidatePath('/teardowns/[slug]', 'page');
  return { ok: true };
}
