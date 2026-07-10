/**
 * 邮件订阅 · 公开 API
 * POST /api/newsletter/subscribe { email, source? }
 * GET  /api/newsletter/unsubscribe?token=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, newsletterSubscribers } from '@/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

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
    await db
      .update(newsletterSubscribers)
      .set({ active: true, source })
      .where(eq(newsletterSubscribers.email, email));
    return NextResponse.json({ ok: true, message: '欢迎回来 · 已重新订阅' });
  }

  await db.insert(newsletterSubscribers).values({
    id: nanoid(),
    email,
    unsubscribeToken: nanoid(32),
    source,
    active: true,
    verified: true,
  });

  return NextResponse.json({ ok: true, message: '订阅成功 · 每周日晚 8 点给你发信' });
}
