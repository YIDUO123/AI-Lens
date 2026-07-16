/**
 * Cron · 补齐 draft 状态的 pick 的 6 维 AI 分析
 * 触发时机:每日 8:25 UTC · 在 daily-picks 抓取(8:21)后 4 分钟
 * 每次并行处理 5 条 · maxDuration=60s
 */
import { NextResponse } from 'next/server';
import { fillDraftPicksWithAI } from '@/lib/fetchers/picks-fill-ai';

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
    const result = await fillDraftPicksWithAI(5);
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (e: any) {
    console.error('[cron/picks-fill-ai]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
