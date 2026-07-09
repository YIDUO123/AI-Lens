import { NextResponse } from 'next/server';
import { fetchAndStoreDailyPicks } from '@/lib/fetchers/daily-picks';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}`;
  const isLocal = req.headers.get('host')?.startsWith('localhost') || req.headers.get('host')?.startsWith('127.');
  if (!isCron && !isLocal && process.env.NODE_ENV === 'production') {
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
