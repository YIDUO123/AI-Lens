import { NextResponse } from 'next/server';
import { fetchAndStoreDailyPicks } from '@/lib/fetchers/daily-picks';

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
    const result = await fetchAndStoreDailyPicks(10);
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (e: any) {
    console.error('[cron/daily-picks]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
