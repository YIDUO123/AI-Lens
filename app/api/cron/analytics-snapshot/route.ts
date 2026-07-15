/**
 * GET /api/cron/analytics-snapshot
 * 每月 1 号跑 · 归档上月数据到 analytics_monthly_snapshots(永久)
 * 顺便清 6 个月前的 user_events(降低 DB 压力)
 *
 * 触发:
 *   1. GitHub Actions monthly-snapshot.yml(推荐)
 *   2. 手动:curl -H "Authorization: Bearer $CRON_SECRET" https://ailens.cloud/api/cron/analytics-snapshot?month=2026-07
 *
 * 归档内容(可后续 SQL 直接查):
 *   ai_summary       · 通道分布 · 成功率 · 平均/P95 延迟 · 各 useCase 计数
 *   event_summary    · 每个 event_name 的计数 + 独立 user/session 数
 *   content_summary  · Top 20 内容(article/teardown)按 view 排 · 及点赞/收藏
 *   meta             · 覆盖天数 · 原始 raw 行数 · 归档时间
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, aiCallLogs, userEvents, analyticsMonthlySnapshots, articles, teardowns, dailyPicks } from '@/db';
import { and, gte, lt, sql, desc, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function authOK(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

// 计算给定日期的上一个月 · 返回 "YYYY-MM" + 起止 Date
function getPrevMonth(now = new Date()): { month: string; start: Date; end: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based · 上月 = m-1
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const month = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  return { month, start, end };
}

// 允许手动指定 month=YYYY-MM
function parseMonthParam(param: string | null): { month: string; start: Date; end: Date } | null {
  if (!param || !/^\d{4}-\d{2}$/.test(param)) return null;
  const [y, m] = param.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { month: param, start, end };
}

export async function GET(req: NextRequest) {
  if (!authOK(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const monthParam = req.nextUrl.searchParams.get('month');
  const range = parseMonthParam(monthParam) || getPrevMonth();

  // ---------- 1. AI 调用汇总 ----------
  const aiRows = await db.select()
    .from(aiCallLogs)
    .where(and(gte(aiCallLogs.createdAt, range.start), lt(aiCallLogs.createdAt, range.end)));

  const aiSummary = summarizeAiCalls(aiRows);

  // ---------- 2. 事件汇总 ----------
  const evtRows = await db.select({
    eventName: userEvents.eventName,
    userId: userEvents.userId,
    sessionId: userEvents.sessionId,
  })
    .from(userEvents)
    .where(and(gte(userEvents.createdAt, range.start), lt(userEvents.createdAt, range.end)));

  const eventSummary = summarizeEvents(evtRows);

  // ---------- 3. 内容 Top(基于当前 DB 快照 · 非月度增量)----------
  // 每月一号跑时 · 反映的是该月月末的排行 · 简单实用
  const [topArticles, topTeardowns, topPicks] = await Promise.all([
    db.select({ id: articles.id, slug: articles.slug, title: articles.title, viewCount: articles.viewCount, likeCount: articles.likeCount })
      .from(articles).where(eq(articles.isDraft, false))
      .orderBy(desc(articles.viewCount)).limit(20),
    db.select({ id: teardowns.id, slug: teardowns.slug, title: teardowns.title, viewCount: teardowns.viewCount, likeCount: teardowns.likeCount })
      .from(teardowns).orderBy(desc(teardowns.viewCount)).limit(20),
    db.select({ id: dailyPicks.id, name: dailyPicks.name, score: dailyPicks.score })
      .from(dailyPicks).where(eq(dailyPicks.isDraft, false))
      .orderBy(desc(dailyPicks.pickedAt)).limit(20),
  ]);

  const contentSummary = {
    top_articles: topArticles,
    top_teardowns: topTeardowns,
    recent_picks: topPicks,
  };

  // ---------- 4. 覆盖天数 / 原始行数(meta)----------
  const meta = {
    month: range.month,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
    ai_call_logs_rows: aiRows.length,
    user_events_rows: evtRows.length,
    snapshot_at: new Date().toISOString(),
  };

  // ---------- 5. Upsert 快照 ----------
  await db.insert(analyticsMonthlySnapshots)
    .values({
      id: nanoid(),
      month: range.month,
      aiSummary,
      eventSummary,
      contentSummary,
      meta,
    })
    .onConflictDoUpdate({
      target: analyticsMonthlySnapshots.month,
      set: { aiSummary, eventSummary, contentSummary, meta, snapshotAt: new Date() },
    });

  // ---------- 6. 清理 6 个月前的 raw 事件(降低 DB 压力)----------
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const cleaned = await db.delete(userEvents).where(lt(userEvents.createdAt, sixMonthsAgo));

  return NextResponse.json({
    ok: true,
    month: range.month,
    ai_call_logs_rows: aiRows.length,
    user_events_rows: evtRows.length,
    ai_summary: aiSummary,
    cleaned_raw_before: sixMonthsAgo.toISOString(),
  });
}

// ============================================================
// 汇总:AI 调用
// ============================================================
function summarizeAiCalls(rows: any[]) {
  if (rows.length === 0) {
    return { total: 0, success: 0, success_rate: 0, by_provider: {}, by_use_case: {} };
  }

  const byProvider: Record<string, { total: number; success: number; ms: number[] }> = {};
  const byUseCase: Record<string, { total: number; success: number; ms: number[] }> = {};
  let totalMs: number[] = [];
  let totalSuccess = 0;
  // 记录"一次就中"数量:attempts_count === 1 且 success
  let firstTryHits = 0;

  for (const r of rows) {
    if (!byProvider[r.provider]) byProvider[r.provider] = { total: 0, success: 0, ms: [] };
    byProvider[r.provider].total++;
    if (r.success) {
      byProvider[r.provider].success++;
      byProvider[r.provider].ms.push(r.durationMs);
      totalSuccess++;
      totalMs.push(r.durationMs);
      if (r.attemptsCount === 1) firstTryHits++;
    }

    if (!byUseCase[r.useCase]) byUseCase[r.useCase] = { total: 0, success: 0, ms: [] };
    byUseCase[r.useCase].total++;
    if (r.success) {
      byUseCase[r.useCase].success++;
      byUseCase[r.useCase].ms.push(r.durationMs);
    }
  }

  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  };

  const provSummary: Record<string, any> = {};
  for (const [k, v] of Object.entries(byProvider)) {
    provSummary[k] = {
      total: v.total,
      success: v.success,
      success_rate: v.total ? +(v.success / v.total).toFixed(4) : 0,
      p50_ms: percentile(v.ms, 0.5),
      p95_ms: percentile(v.ms, 0.95),
    };
  }

  const ucSummary: Record<string, any> = {};
  for (const [k, v] of Object.entries(byUseCase)) {
    ucSummary[k] = {
      total: v.total,
      success: v.success,
      success_rate: v.total ? +(v.success / v.total).toFixed(4) : 0,
      p50_ms: percentile(v.ms, 0.5),
      p95_ms: percentile(v.ms, 0.95),
    };
  }

  return {
    total: rows.length,
    success: totalSuccess,
    success_rate: +(totalSuccess / rows.length).toFixed(4),
    first_try_hit_rate: totalSuccess ? +(firstTryHits / totalSuccess).toFixed(4) : 0,
    p50_ms: percentile(totalMs, 0.5),
    p95_ms: percentile(totalMs, 0.95),
    by_provider: provSummary,
    by_use_case: ucSummary,
  };
}

// ============================================================
// 汇总:通用事件
// ============================================================
function summarizeEvents(rows: { eventName: string; userId: string | null; sessionId: string | null }[]) {
  if (rows.length === 0) return { total: 0, events: {} };

  const events: Record<string, { count: number; users: Set<string>; sessions: Set<string> }> = {};
  for (const r of rows) {
    if (!events[r.eventName]) events[r.eventName] = { count: 0, users: new Set(), sessions: new Set() };
    events[r.eventName].count++;
    if (r.userId) events[r.eventName].users.add(r.userId);
    if (r.sessionId) events[r.eventName].sessions.add(r.sessionId);
  }

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(events)) {
    out[k] = { count: v.count, unique_users: v.users.size, unique_sessions: v.sessions.size };
  }

  return { total: rows.length, events: out };
}
