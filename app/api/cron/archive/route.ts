import { NextResponse } from 'next/server';
import { db, newsItems, releases } from '@/db';
import { lt } from 'drizzle-orm';

/**
 * GET /api/cron/archive
 * 每周执行一次,删除 90 天前的 news_items 和 releases
 * 保护免费额度 · 500 MB 永远用不完
 *
 * 说明:
 * - articles / teardowns / timeline / daily_picks 全部保留(那是你的内容)
 * - 只清理"聚合的第三方新闻"(反正没人翻 3 个月前的资讯)
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DAYS_TO_KEEP = 90;

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

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_TO_KEEP);

  try {
    const [deletedNews] = await db
      .delete(newsItems)
      .where(lt(newsItems.publishedAt, cutoff))
      .returning({ id: newsItems.id });

    const [deletedRel] = await db
      .delete(releases)
      .where(lt(releases.publishedAt, cutoff))
      .returning({ id: releases.id });

    return NextResponse.json({
      ok: true,
      cutoff: cutoff.toISOString(),
      deleted: {
        news_items: deletedNews ? 1 : 0,
        releases: deletedRel ? 1 : 0,
      },
      at: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[cron/archive]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
