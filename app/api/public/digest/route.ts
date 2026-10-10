/**
 * 公开只读 API · GET /api/public/digest
 * 今日精选(默认 10 条,最多 20)· 附六维 TL;DR 与站内卡片链接
 * 匿名只读 · CORS 全开 · 供 Agent / 脚本 / 第三方消费
 * ?limit=20 自定义条数
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildDailyDigest } from '@/lib/fetchers/daily-digest';
import { getNewsCards } from '@/lib/ai/news-card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 1), 20);

  try {
    const digest = await buildDailyDigest(null, limit, 24, null);
    const cards = await getNewsCards(digest.items.map((i) => i.id));

    const items = digest.items.map((it) => {
      const card = cards.get(it.id);
      return {
        id: it.id,
        title: it.title,
        tldr: card?.tldr || it.summary || '',
        category: it.category,
        source: it.source,
        publishedAt: it.publishedAt,
        // 六维(有缓存才带,公开 API 不触发 AI 生成)
        dims: card?.dims || null,
        originalUrl: it.url || it.permalink || null,
        cardUrl: `${url.origin}/news/card/${it.id}`,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        updatedAt: new Date().toISOString(),
        windowHours: digest.windowHours,
        count: items.length,
        items,
        docs: `${url.origin}/agent`,
      },
      { headers: { ...CORS, 'Cache-Control': 'public, max-age=900, s-maxage=900' } },
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'internal error' }, { status: 500, headers: CORS });
  }
}
