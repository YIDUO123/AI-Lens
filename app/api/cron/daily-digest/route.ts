/**
 * 每日精编推送 · cron
 * GET /api/cron/daily-digest  (GitHub Actions 每小时触发 · 带 CRON_SECRET)
 *
 * 流程:
 *   1. 找「本小时该发、今天还没发」的日订阅者(按北京时间 sendTime 的小时匹配)
 *   2. 为每人 buildDailyDigest(偏好) · 汇总所有 newsId → ensureNewsCards 一次性补齐六维
 *   3. 渲染(邮件 HTML / 京me·飞书 文本)→ sendToSubscriber 按渠道发 → 标记 lastDailySentAt
 *
 * 测试:GET /api/cron/daily-digest?test=1&email=you@x.com  立即给自己发一封(忽略时间窗)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, newsletterSubscribers } from '@/db';
import { eq, and } from 'drizzle-orm';
import { buildDailyDigest } from '@/lib/fetchers/daily-digest';
import { ensureNewsCards, getNewsCards } from '@/lib/ai/news-card';
import { renderDigestEmail, renderDigestText, enrichItems } from '@/lib/digest/render';
import { sendToSubscriber } from '@/lib/channels';
import { DEFAULT_DIGEST_PREFERENCES, type NewsletterSubscriber } from '@/db';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function authOK(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  // 兼容两种:Authorization: Bearer(Vercel Cron)· ?token=(GitHub Actions,同现有 workflow)
  if ((req.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  if (new URL(req.url).searchParams.get('token') === secret) return true;
  return false;
}

/** 当前北京时间的 小时(0-23) 和 日期串(YYYY-MM-DD) */
function beijingNow(): { hour: number; dateStr: string; label: string } {
  const now = new Date();
  const bj = new Date(now.getTime() + 8 * 60 * 60 * 1000); // UTC+8
  const hour = bj.getUTCHours();
  const y = bj.getUTCFullYear(), m = bj.getUTCMonth() + 1, d = bj.getUTCDate();
  return {
    hour,
    dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    label: `${m} 月 ${d} 日`,
  };
}

function sentToday(sub: NewsletterSubscriber, dateStr: string): boolean {
  if (!sub.lastDailySentAt) return false;
  const bj = new Date(new Date(sub.lastDailySentAt).getTime() + 8 * 60 * 60 * 1000);
  const s = `${bj.getUTCFullYear()}-${String(bj.getUTCMonth() + 1).padStart(2, '0')}-${String(bj.getUTCDate()).padStart(2, '0')}`;
  return s === dateStr;
}

export async function GET(req: NextRequest) {
  if (!authOK(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const testMode = url.searchParams.get('test') === '1';
  const testEmail = url.searchParams.get('email');
  const { hour, dateStr, label } = beijingNow();

  // 取所有活跃订阅者
  const all = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.active, true));

  // 筛选「本小时该发且今天没发」· 测试模式只发指定邮箱
  const due = all.filter((s) => {
    if (testMode) return testEmail ? s.email === testEmail : true;
    const prefs = s.preferences;
    // 只推「显式选了每日精编」的订阅者 · 老的周报订阅者(preferences=null)不动
    if (!prefs || prefs.frequency !== 'daily') return false;
    const sendHour = parseInt((prefs.sendTime || '09:00').split(':')[0], 10) || 9;
    if (sendHour !== hour) return false;
    return !sentToday(s, dateStr);
  });

  if (due.length === 0) {
    return NextResponse.json({ ok: true, message: '本小时无人需要推送', stats: { hour, total: all.length } });
  }

  // 为每人算 digest(小规模逐个;后续可按偏好去重合并)
  const digests = await Promise.all(
    due.map(async (s) => ({ sub: s, digest: await buildDailyDigest(s.preferences || DEFAULT_DIGEST_PREFERENCES, 10, 24, s.userId) })),
  );

  // 汇总所有 newsId → 一次性补齐六维卡片(共享缓存)
  const allIds = Array.from(new Set(digests.flatMap((d) => d.digest.items.map((i) => i.id))));
  const cardStats = await ensureNewsCards(allIds);
  const cards = await getNewsCards(allIds);

  let sent = 0, failed = 0;
  const results: any[] = [];

  for (const { sub, digest } of digests) {
    const enriched = enrichItems(digest.items, cards);
    const format = sub.preferences?.format || 'both';
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || 'https://ailens.cloud'}/api/newsletter/unsubscribe?token=${sub.unsubscribeToken}`;

    const payload = {
      subject: `AI Lens 每日精编 · ${label}`,
      html: renderDigestEmail(enriched, { matched: digest.matched, date: label, unsubscribeUrl }),
      text: renderDigestText(enriched, { matched: digest.matched, date: label }),
      // 京ME 卡片模板变量(配了 JDME_CARD_TEMPLATE_ID 才用)· 模板用这些变量名
      cardData: {
        title: `AI Lens 每日精编 · ${label}`,
        date: label,
        count: String(enriched.length),
        matched: String(digest.matched),
        body: renderDigestText(enriched, { matched: digest.matched, date: label }),
        top1: enriched[0]?.tldr || enriched[0]?.title || '',
        top2: enriched[1]?.tldr || enriched[1]?.title || '',
        top3: enriched[2]?.tldr || enriched[2]?.title || '',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || 'https://ailens.cloud'}/news`,
      },
    };

    const r = await sendToSubscriber(sub, payload);
    const okAny = r.some((x) => x.ok);
    if (okAny) sent++; else failed++;
    results.push({ email: sub.email, channels: r });

    if (okAny && !testMode) {
      await db.update(newsletterSubscribers).set({ lastDailySentAt: new Date() }).where(eq(newsletterSubscribers.id, sub.id));
    }
  }

  return NextResponse.json({
    ok: true,
    stats: { hour, due: due.length, sent, failed, cards: cardStats, testMode },
    results: results.slice(0, 10),
  });
}
