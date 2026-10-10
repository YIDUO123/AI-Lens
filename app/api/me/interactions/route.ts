/**
 * GET /api/me/interactions
 * 当前用户在 news_item 上的赞/藏 id 列表(给 ISR 页面的客户端补齐用)
 * 未登录返回 isLoggedIn:false · 轻量,无缓存
 */
import { NextResponse } from 'next/server';
import { db, likes, saves } from '@/db';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ isLoggedIn: false, likedIds: [], savedIds: [] });
    }
    const userId = session.user.id;
    const [likeRows, saveRows] = await Promise.all([
      db.select({ id: likes.targetId }).from(likes)
        .where(and(eq(likes.userId, userId), eq(likes.targetType, 'news_item'))).limit(1000),
      db.select({ id: saves.targetId }).from(saves)
        .where(and(eq(saves.userId, userId), eq(saves.targetType, 'news_item'))).limit(1000),
    ]);
    return NextResponse.json({
      isLoggedIn: true,
      likedIds: likeRows.map((r) => r.id),
      savedIds: saveRows.map((r) => r.id),
    });
  } catch {
    return NextResponse.json({ isLoggedIn: false, likedIds: [], savedIds: [] });
  }
}
