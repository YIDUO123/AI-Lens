import { NextResponse } from 'next/server';
import { fetchAndStoreModels } from '@/lib/fetchers/models';
import { autoUpdateTimeline } from '@/lib/fetchers/timeline-auto';

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
    const result = await fetchAndStoreModels();

    // 顺手做时间线自动补充(失败不影响模型同步)
    let timeline: { inserted: number; candidates: number } = { inserted: 0, candidates: 0 };
    try {
      timeline = await autoUpdateTimeline();
    } catch (e: any) {
      console.error('[cron/models] timeline-auto', e);
    }

    return NextResponse.json({ ok: true, ...result, timeline, at: new Date().toISOString() });
  } catch (e: any) {
    console.error('[cron/models]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
