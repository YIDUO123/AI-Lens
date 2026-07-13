'use server';

/**
 * 互动 · 收藏 · 点赞 · 评论
 *
 * ⚠️ EdgeOne 兼容:所有 action **不调用 revalidatePath** ——
 * revalidatePath 会触发 Next.js 从 EdgeOne 返回 RSC payload 更新客户端 · 该协议
 * EdgeOne 目前不完全兼容 · 会导致客户端渲染错误。改为:让 action 只做 DB 写入
 * 并返回新数据 · 客户端本地更新 state。下次自然刷新页面时 · 缓存过期后自动拉最新。
 */
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, saves, likes, comments, user as userTable } from '@/db';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

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
    return { saved: false };
  }

  await db.insert(saves).values({
    id: nanoid(),
    userId: user.id,
    targetType,
    targetId,
  });
  return { saved: true };
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
    return { liked: false };
  }

  await db.insert(likes).values({
    id: nanoid(),
    userId: user.id,
    targetType,
    targetId,
  });
  return { liked: true };
}

// ============================================================
// Comments · 评论
// ============================================================
export type PostedComment = {
  id: string;
  body: string;
  userId: string;
  parentId: string | null;
  isEditorPick: boolean;
  createdAt: Date;
  userName: string | null;
  userImage: string | null;
  userRole: string | null;
};

export async function postComment(input: {
  targetType: TargetType;
  targetId: string;
  body: string;
  parentId?: string;
}): Promise<PostedComment> {
  const user = await requireUser();
  const body = input.body.trim();
  if (!body) throw new Error('评论内容不能为空');
  if (body.length > 2000) throw new Error('评论过长(最多 2000 字)');

  const id = nanoid();
  const now = new Date();
  await db.insert(comments).values({
    id,
    userId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
    body,
    parentId: input.parentId || null,
    createdAt: now,
  });

  // 拉一下用户信息 · 前端才好渲染新评论
  const [u] = await db.select({ name: userTable.name, image: userTable.image, role: userTable.role })
    .from(userTable).where(eq(userTable.id, user.id)).limit(1);

  return {
    id,
    body,
    userId: user.id,
    parentId: input.parentId || null,
    isEditorPick: false,
    createdAt: now,
    userName: u?.name || user.name || null,
    userImage: u?.image || (user as any).image || null,
    userRole: u?.role || (user as any).role || 'reader',
  };
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const role = (user as any).role || 'reader';

  const [c] = await db.select({ userId: comments.userId }).from(comments).where(eq(comments.id, commentId)).limit(1);
  if (!c) throw new Error('评论不存在');
  if (c.userId !== user.id && role !== 'admin') throw new Error('无权限删除');

  await db.delete(comments).where(eq(comments.id, commentId));
  return { ok: true };
}
