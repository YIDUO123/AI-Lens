/**
 * 打赏开关 · 公开只读接口(不缓存)
 * 供 DonationBubble 客户端实时拉取,绕开 HTML/CDN 缓存 → 后台一改立即生效。
 */
import { NextResponse } from 'next/server';
import { db, siteSettings } from '@/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let enabled = true;
  try {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, 'donation_enabled')).limit(1);
    enabled = row?.value !== '0';
  } catch {
    enabled = true;
  }
  return NextResponse.json(
    { enabled },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
