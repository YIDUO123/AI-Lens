'use server';

/**
 * 用户相关 · 更新头像 · 未来可加改名字等
 */
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, user as userTable } from '@/db';
import { eq } from 'drizzle-orm';

export async function updateUserAvatar(imageUrl: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('未登录');
  if (!imageUrl || !/^https?:\/\//.test(imageUrl)) throw new Error('URL 无效');
  if (imageUrl.length > 500) throw new Error('URL 太长');

  await db.update(userTable).set({ image: imageUrl, updatedAt: new Date() }).where(eq(userTable.id, session.user.id));
  return { ok: true };
}
