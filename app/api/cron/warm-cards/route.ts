/**
 * 卡片预热 · 独立端点(和抓新闻解耦,避免拖垮关键路径)
 * GET /api/cron/warm-cards?token=<CRON_SECRET>&n=15
 *   只处理"最近、且还没生成卡片"的资讯,一次最多 n 条(默认 15,上限 25)。
 *   ensureNewsCards 已有的跳过,所以可反复调,逐步把最近资讯的卡片补满。
 * 建议 GitHub Actions 每小时调一次;demo 前手动多调几次即可。
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, newsItems, newsCards } from '@/db';
import { desc, notInArray, sql } from 'drizzle-orm';
import { ensureNewsCards } from '@/lib/ai/news-card';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function authOK(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const token = new URL(req.url).searchParams.get('token');
  if (token === secret) return true;
  if ((req.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authOK(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const n = Math.min(25, Math.max(1, parseInt(new URL(req.url).searchParams.get('n') || '15', 10) || 15));

  // 已有卡片的 id
  const cached = await db.select({ id: newsCards.id }).from(newsCards);
  const cachedIds = cached.map((r) => r.id);

  // 最近的、还没卡片的资讯 top n
  const recent = await db
    .select({ id: newsItems.id })
    .from(newsItems)
    .where(cachedIds.length ? notInArray(newsItems.id, cachedIds) : undefined)
    .orderBy(desc(newsItems.publishedAt), desc(newsItems.score))
    .limit(n);

  const stats = await ensureNewsCards(recent.map((r) => r.id));

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(newsCards);
  return NextResponse.json({ ok: true, processed: recent.length, ...stats, totalCards: total });
}
