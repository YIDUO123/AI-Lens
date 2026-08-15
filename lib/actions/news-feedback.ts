'use server';

/**
 * 资讯反馈 · 👍有用 / 👎没用
 * 登录用户一条资讯一票(upsert)· 未登录也允许(不去重,仅计数)
 * 数据用于「滤镜越用越准」:后续按用户 👎 的 category/source 在 buildDailyDigest 里降权。
 */
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, newsFeedback, newsItems } from '@/db';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logEvent } from '@/lib/analytics/log';

export async function voteNews(newsId: string, vote: 1 | -1): Promise<{ ok: boolean; up: number; down: number; myVote: number }> {
  if (vote !== 1 && vote !== -1) return { ok: false, up: 0, down: 0, myVote: 0 };

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id || null;

  // 冗余带上 category/source 便于聚合校准
  const [item] = await db.select({ category: newsItems.category, source: newsItems.source }).from(newsItems).where(eq(newsItems.id, newsId)).limit(1);

  if (userId) {
    const [existing] = await db.select().from(newsFeedback).where(and(eq(newsFeedback.newsId, newsId), eq(newsFeedback.userId, userId))).limit(1);
    if (existing) {
      // 再点同一个 = 取消;点相反 = 改票
      if (existing.vote === vote) {
        await db.delete(newsFeedback).where(eq(newsFeedback.id, existing.id));
      } else {
        await db.update(newsFeedback).set({ vote }).where(eq(newsFeedback.id, existing.id));
      }
    } else {
      await db.insert(newsFeedback).values({ id: nanoid(), newsId, userId, vote, category: item?.category, source: item?.source });
    }
  } else {
    // 匿名:直接记一票(不去重)
    await db.insert(newsFeedback).values({ id: nanoid(), newsId, userId: null, vote, category: item?.category, source: item?.source });
  }

  logEvent('news_feedback', { vote, category: item?.category }, { userId: userId || undefined, path: `/news/card/${newsId}` });

  const counts = await getNewsFeedbackCounts(newsId, userId);
  return { ok: true, ...counts };
}

export async function getNewsFeedbackCounts(newsId: string, userId?: string | null): Promise<{ up: number; down: number; myVote: number }> {
  const rows = await db
    .select({ vote: newsFeedback.vote, n: sql<number>`count(*)::int` })
    .from(newsFeedback)
    .where(eq(newsFeedback.newsId, newsId))
    .groupBy(newsFeedback.vote);
  let up = 0, down = 0;
  for (const r of rows) { if (r.vote > 0) up = r.n; else down = r.n; }

  let myVote = 0;
  if (userId) {
    const [mine] = await db.select({ vote: newsFeedback.vote }).from(newsFeedback).where(and(eq(newsFeedback.newsId, newsId), eq(newsFeedback.userId, userId))).limit(1);
    myVote = mine?.vote || 0;
  }
  return { up, down, myVote };
}
