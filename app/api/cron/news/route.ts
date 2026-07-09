import { NextResponse } from 'next/server';
import { fetchAndStoreNews } from '@/lib/fetchers/news';
import { extractAndStoreReleases } from '@/lib/fetchers/releases';

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
    return NextResponse.json({ ok: true, news, releases: rel, at: new Date().toISOString() });
  } catch (e: any) {
    console.error('[cron/news]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
