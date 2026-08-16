/**
 * 站点设置 · 读取(带缓存)
 * 与 lib/actions/settings.ts(写)分开:这里是普通模块,可被 unstable_cache 包裹。
 * 写操作 revalidateTag('site-settings') 后即时失效。
 */
import { unstable_cache } from 'next/cache';
import { db, siteSettings } from '@/db';
import { eq } from 'drizzle-orm';

/** 打赏泡泡是否展示 · 默认 true(未设置 = 展示)· admin 关掉才为 false */
export const isDonationEnabled = unstable_cache(
  async (): Promise<boolean> => {
    try {
      const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, 'donation_enabled')).limit(1);
      return row?.value !== '0'; // 未设置或 '1' 都视为开
    } catch {
      return true; // 读失败不影响展示
    }
  },
  ['donation-enabled'],
  { tags: ['site-settings'], revalidate: 300 },
);
