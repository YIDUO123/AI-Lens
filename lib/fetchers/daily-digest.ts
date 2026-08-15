/**
 * P1 · 每日精编推送 · 选取逻辑
 * 按用户偏好从近 N 小时资讯里挑 10 条:
 *   1. 命中 modules(category)+ models(关键词) 的资讯优先
 *   2. 按 score + 新鲜度排序
 *   3. 不足 10 条 → 用全站 Top 资讯补齐(兜底)
 * 输出给邮件/飞书/京me 渠道共用。
 */
import { db, newsItems, newsFeedback } from '@/db';
import { and, gte, desc, sql, inArray, notInArray, eq } from 'drizzle-orm';
import type { DigestPreferences, NewsItem } from '@/db';

const DEFAULT_COUNT = 10;
const LOOKBACK_HOURS = 24;

export type DigestItem = Pick<
  NewsItem,
  'id' | 'title' | 'url' | 'permalink' | 'summary' | 'source' | 'category' | 'score' | 'publishedAt'
> & {
  /** 是否兜底补齐进来的(非用户偏好命中) */
  backfill: boolean;
};

export type DailyDigest = {
  items: DigestItem[];
  matched: number;   // 偏好命中的条数
  backfilled: number; // 兜底补齐的条数
  deduped: number;    // 去重合并掉的条数
  windowHours: number;
};

// ---- 智能去重 · 同一事件多源合并 ----
// 轻量规则版:标题归一化 + token Jaccard 相似度,不上向量。
function normalizeTitle(t: string): string {
  return (t || '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '') // 去空格/标点/符号
    .trim();
}
function tokenSet(t: string): Set<string> {
  // 中文按 2-gram,英文按词;混合都拆
  const clean = (t || '').toLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ');
  const tokens = new Set<string>();
  for (const w of clean.split(/\s+/).filter((x) => x.length > 1)) {
    if (/[a-z0-9]/.test(w)) tokens.add(w);
  }
  const zh = (t || '').replace(/[^一-龥]/g, '');
  for (let i = 0; i < zh.length - 1; i++) tokens.add(zh.slice(i, i + 2));
  return tokens;
}
function similar(a: string, b: string): boolean {
  const na = normalizeTitle(a), nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const sa = tokenSet(a), sb = tokenSet(b);
  if (sa.size < 2 || sb.size < 2) return false;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const jaccard = inter / (sa.size + sb.size - inter);
  return jaccard >= 0.55;
}

/** 对已按 score 降序的候选去重:同一事件保留分数最高的那条 */
function dedupe(items: DigestItem[]): { kept: DigestItem[]; removed: number } {
  const kept: DigestItem[] = [];
  let removed = 0;
  for (const it of items) {
    if (kept.some((k) => similar(k.title, it.title))) { removed++; continue; }
    kept.push(it);
  }
  return { kept, removed };
}

// ---- 反馈画像 · "越用越准" ----
// 读用户对各 category / source 的净票(👍+1 / 👎-1),用于给候选调整排序分。
type FeedbackProfile = { cat: Map<string, number>; src: Map<string, number> };

async function getFeedbackProfile(userId: string): Promise<FeedbackProfile> {
  const rows = await db
    .select({ category: newsFeedback.category, source: newsFeedback.source, net: sql<number>`sum(${newsFeedback.vote})::int` })
    .from(newsFeedback)
    .where(eq(newsFeedback.userId, userId))
    .groupBy(newsFeedback.category, newsFeedback.source);
  const cat = new Map<string, number>(), src = new Map<string, number>();
  for (const r of rows) {
    if (r.category) cat.set(r.category, (cat.get(r.category) || 0) + (r.net || 0));
    if (r.source) src.set(r.source, (src.get(r.source) || 0) + (r.net || 0));
  }
  return { cat, src };
}

const FEEDBACK_UNIT = 8; // 每点净票调整 8 分 · score 本身 0-100 量级
const FEEDBACK_CLAMP = 3; // 净票封顶 ±3 → 最多 ±24 分

/** 用反馈画像给候选算调整后分数(不改原 score,只影响排序) */
function adjustedScore(it: DigestItem, prof: FeedbackProfile | null): number {
  if (!prof) return it.score;
  const clamp = (n: number) => Math.max(-FEEDBACK_CLAMP, Math.min(FEEDBACK_CLAMP, n));
  const catAdj = it.category ? clamp(prof.cat.get(it.category) || 0) : 0;
  const srcAdj = it.source ? clamp(prof.src.get(it.source) || 0) : 0;
  return it.score + (catAdj + srcAdj) * FEEDBACK_UNIT;
}

/**
 * 按偏好构造当天精编。
 * @param prefs   用户偏好(modules/models)· 传 null 走全站默认
 * @param count   条数 · 默认 10
 * @param lookbackHours 时间窗 · 默认 24h
 * @param userId  登录用户 · 传入则用其反馈历史做"越用越准"降权/上浮
 */
export async function buildDailyDigest(
  prefs: Partial<DigestPreferences> | null,
  count: number = DEFAULT_COUNT,
  lookbackHours: number = LOOKBACK_HOURS,
  userId?: string | null,
): Promise<DailyDigest> {
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const modules = (prefs?.modules || []).filter(Boolean);
  const models = (prefs?.models || []).filter(Boolean).map((m) => m.toLowerCase());

  const cols = {
    id: newsItems.id,
    title: newsItems.title,
    url: newsItems.url,
    permalink: newsItems.permalink,
    summary: newsItems.summary,
    source: newsItems.source,
    category: newsItems.category,
    score: newsItems.score,
    publishedAt: newsItems.publishedAt,
  };

  // 排序:重要度优先,同分按新鲜度
  const orderBy = [desc(newsItems.score), desc(newsItems.publishedAt)];

  // 超量取候选(为去重留冗余)· 各阶段取 count*3
  const OVER = count * 3;

  // ---- 1) 偏好命中的资讯 ----
  const conds = [gte(newsItems.publishedAt, since)];
  if (modules.length) conds.push(inArray(newsItems.category, modules));
  if (models.length) {
    // 模型关键词:标题或摘要里出现任一关键词(P1 用关键词匹配,后续可升级为打标)
    const kw = models
      .map((m) => sql`(lower(${newsItems.title}) LIKE ${'%' + m + '%'} OR lower(coalesce(${newsItems.summary}, '')) LIKE ${'%' + m + '%'})`)
      .reduce((acc, cur) => (acc ? sql`${acc} OR ${cur}` : cur));
    conds.push(sql`(${kw})`);
  }

  const matched = await db
    .select(cols)
    .from(newsItems)
    .where(and(...conds))
    .orderBy(...orderBy)
    .limit(OVER);

  // 候选池:命中优先(backfill=false),再拼兜底候选
  const pool: DigestItem[] = matched.map((r) => ({ ...r, backfill: false }));

  // ---- 2) 兜底候选(时间窗内非命中)----
  {
    const seenIds = pool.map((i) => i.id);
    const c = [gte(newsItems.publishedAt, since)];
    if (seenIds.length) c.push(notInArray(newsItems.id, seenIds));
    const extra = await db.select(cols).from(newsItems).where(and(...c)).orderBy(...orderBy).limit(OVER);
    pool.push(...extra.map((r) => ({ ...r, backfill: true })));
  }

  // ---- 3) 仍不够 → 放宽到全站 Top(不限时间)----
  if (pool.length < OVER) {
    const seenIds = pool.map((i) => i.id);
    const c = seenIds.length ? [notInArray(newsItems.id, seenIds)] : [];
    const extra = await db
      .select(cols)
      .from(newsItems)
      .where(c.length ? and(...c) : undefined)
      .orderBy(...orderBy)
      .limit(OVER);
    pool.push(...extra.map((r) => ({ ...r, backfill: true })));
  }

  // ---- 反馈重排(越用越准)→ 去重 → 取 count ----
  const profile = userId ? await getFeedbackProfile(userId) : null;
  if (profile) {
    // 按调整后分数稳定重排(反馈影响顺序,DB score 仍是基础)
    pool.sort((a, b) => adjustedScore(b, profile) - adjustedScore(a, profile));
  }
  const { kept, removed } = dedupe(pool);
  const finalItems = kept.slice(0, count);

  return {
    items: finalItems,
    matched: finalItems.filter((i) => !i.backfill).length,
    backfilled: finalItems.filter((i) => i.backfill).length,
    deduped: removed,
    windowHours: lookbackHours,
  };
}
