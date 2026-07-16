/**
 * 找 6 维空的 pick(不管 draft 与否)· 并行调 AI 补齐 · 补完发布
 * 每次限 5 条 · 3 小时内不重复尝试(防止 AI 通道全挂时死循环烧 token)
 *
 * 触发方式:
 * 1. Vercel Cron · 每日 8:25 UTC(抓取 4 分钟后)
 * 2. 手动 · GET /api/cron/picks-fill-ai?token=<CRON_SECRET>
 *
 * 覆盖场景:
 *   ①新抓的 draft(isDraft=true · 6 维空)→ 补完发布
 *   ②历史遗留裸卡片(isDraft=false · 6 维空)→ 补完保持已发布
 */
import { db, dailyPicks } from '@/db';
import { and, isNull, or, lt, sql, inArray, asc, eq } from 'drizzle-orm';
import { generatePickAnalysis } from '@/lib/ai/gemini';
import { revalidatePath } from 'next/cache';

interface FillResult {
  attempted: number;
  succeeded: number;
  failed: number;
  failedIds: string[];
}

export async function fillDraftPicksWithAI(limit = 5): Promise<FillResult> {
  // 找候选 · 6 维空 + 3 小时内没重试过
  const drafts = await db.select().from(dailyPicks)
    .where(
      and(
        isNull(dailyPicks.positioning),
        or(
          isNull(dailyPicks.updatedAt),
          lt(dailyPicks.updatedAt, sql`NOW() - INTERVAL '3 hours'`),
        ),
      ),
    )
    .orderBy(asc(dailyPicks.pickedAt))
    .limit(limit);

  if (drafts.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, failedIds: [] };
  }

  // 并行调 AI · 每条独立错误处理
  const results = await Promise.allSettled(
    drafts.map(async (p) => {
      const analysis = await generatePickAnalysis({
        name: p.name,
        url: p.url,
        tagline: p.tagline || '',
        category: p.category,
      });

      await db.update(dailyPicks).set({
        positioning:     analysis.positioning,
        painPoint:       analysis.painPoint,
        solution:        analysis.solution,
        designHighlight: analysis.designHighlight,
        vibeCoding:      analysis.vibeCoding,
        commercial:      analysis.commercial,
        consensus:       analysis.consensus,
        criticism:       analysis.criticism,
        editorTake:      analysis.editorTake,
        isDraft:         false,   // ← 补齐 6 维后自动发布
        updatedAt:       new Date(),
      }).where(eq(dailyPicks.id, p.id));

      return p.id;
    }),
  );

  const failedIds: string[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      failedIds.push(drafts[i].id);
      console.error(`[picks-fill-ai] ${drafts[i].id} · ${drafts[i].name} 失败:`, (results[i] as PromiseRejectedResult).reason);
    }
  }

  // 失败的也 touch updatedAt · 3 小时冷却 · 防止死循环
  if (failedIds.length > 0) {
    await db.update(dailyPicks)
      .set({ updatedAt: new Date() })
      .where(inArray(dailyPicks.id, failedIds));
  }

  // 有成功的话 · 刷新公开列表 + admin
  if (results.some((r) => r.status === 'fulfilled')) {
    revalidatePath('/teardowns');
    revalidatePath('/admin/picks');
  }

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  return { attempted: drafts.length, succeeded, failed: failedIds.length, failedIds };
}
