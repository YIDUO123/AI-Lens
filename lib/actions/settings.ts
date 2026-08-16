'use server';

/**
 * 站点设置 · 键值开关
 * 目前:donation_enabled 控制打赏泡泡是否展示
 */
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, siteSettings } from '@/db';
import { eq } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as any)?.role || 'reader';
  if (role !== 'admin') throw new Error('无权限');
  return session!.user;
}

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db
    .insert(siteSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  revalidateTag('site-settings');
  return { ok: true };
}

/** 打赏开关 · 默认开(未设置时展示)· admin 可关 */
export async function setDonationEnabled(enabled: boolean): Promise<{ ok: boolean }> {
  return setSetting('donation_enabled', enabled ? '1' : '0');
}
