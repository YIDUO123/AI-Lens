/**
 * 邮件订阅 · 公开 API
 * POST /api/newsletter/subscribe { email, source? }
 * GET  /api/newsletter/unsubscribe?token=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, newsletterSubscribers } from '@/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logEvent } from '@/lib/analytics/log';
import { DEFAULT_DIGEST_PREFERENCES } from '@/db';

export const runtime = 'nodejs';

// 公开邮箱订阅默认走「每日精编」· 全模块 · 早 9 点 · 邮件渠道
const PUBLIC_DEFAULT_PREFS = { ...DEFAULT_DIGEST_PREFERENCES, frequency: 'daily' as const, channels: ['email' as const] };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const source = String(body.source || 'unknown').slice(0, 32);

  // 简单邮箱验证
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '邮箱格式不对' }, { status: 400 });
  }
  if (email.length > 200) {
    return NextResponse.json({ error: '邮箱太长' }, { status: 400 });
  }

  // 已存在就复活(处理"退订后再订阅"的情形)
  const [existing] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);

  if (existing) {
    if (existing.active) {
      return NextResponse.json({ ok: true, message: '你已经订阅了 · 谢谢!' });
    }
    // 复活时补上每日精编偏好(老数据可能为 null)
    await db
      .update(newsletterSubscribers)
      .set({ active: true, source, preferences: existing.preferences || PUBLIC_DEFAULT_PREFS })
      .where(eq(newsletterSubscribers.email, email));
    logEvent('newsletter_resubscribe', { source }, { path: '/api/newsletter/subscribe' });
    return NextResponse.json({ ok: true, message: '欢迎回来 · 已重新订阅每日精编' });
  }

  await db.insert(newsletterSubscribers).values({
    id: nanoid(),
    email,
    unsubscribeToken: nanoid(32),
    source,
    active: true,
    verified: true,
    preferences: PUBLIC_DEFAULT_PREFS,
  });

  // 埋点 · 首次订阅
  logEvent('newsletter_subscribe', { source, is_new: true }, { path: '/api/newsletter/subscribe' });

  return NextResponse.json({ ok: true, message: '订阅成功 · 每天早 9 点给你发精编 10 条' });
}
