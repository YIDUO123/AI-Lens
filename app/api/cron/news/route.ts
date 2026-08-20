import { NextResponse } from 'next/server';
import { fetchAndStoreNews } from '@/lib/fetchers/news';
import { extractAndStoreReleases } from '@/lib/fetchers/releases';
import { db, newsItems } from '@/db';
import { desc } from 'drizzle-orm';
import { ensureNewsCards } from '@/lib/ai/news-card';

/**
 * GET /api/cron/news
 * Vercel Cron 自动触发,或手动带 ?token= 触发
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  const isCron = authHeader === `Bearer ${secret}`;
  const isTokenAuth = secret && token === secret;
  const isLocal = req.headers.get('host')?.match(/^(localhost|127\.)/);

  if (!isCron && !isTokenAuth && !isLocal && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const news = await fetchAndStoreNews(200);
    const rel = await extractAndStoreReleases(30);

    // 预热六维卡片:给最新的高分资讯先生成好,用户点进卡片页即时可看(不用等 17s AI)
    // ensureNewsCards 已有的跳过,只生成新的;失败不影响 cron。
    let warm: any = null;
    try {
      const top = await db
        .select({ id: newsItems.id })
        .from(newsItems)
        .orderBy(desc(newsItems.publishedAt), desc(newsItems.score))
        .limit(10);
      warm = await ensureNewsCards(top.map((r) => r.id));
    } catch (e: any) {
      warm = { error: e.message };
    }

    return NextResponse.json({ ok: true, news, releases: rel, warmCards: warm, at: new Date().toISOString() });
  } catch (e: any) {
    console.error('[cron/news]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
