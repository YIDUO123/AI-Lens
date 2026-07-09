import { NextResponse } from 'next/server';
import { fetchAndStoreNews } from '@/lib/fetchers/news';
import { extractAndStoreReleases } from '@/lib/fetchers/releases';

/**
 * GET /api/cron/news
 * Vercel Cron 会 GET 这个 endpoint
 * 也支持手动触发(用于测试和首次 seed)
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  // 简单的鉴权:Vercel Cron 会带 authorization,或允许手动无认证(便于本地测试)
  const auth = req.headers.get('authorization');
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}`;
  const isLocal = req.headers.get('host')?.startsWith('localhost') || req.headers.get('host')?.startsWith('127.');
  if (!isCron && !isLocal && process.env.NODE_ENV === 'production') {
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
