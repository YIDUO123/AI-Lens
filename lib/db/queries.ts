/**
 * 查询辅助函数
 * 服务端组件和 API 都可以用
 *
 * ⚡ 公开数据(无用户身份)用 unstable_cache 包装 · 走 Vercel Data Cache · 中国用户切换页面命中率显著提升
 */
import { db, newsItems, models, releases, dailyPicks, articles, teardowns, timelineVersions, saves, likes, comments, user as userTable } from '@/db';
import { desc, eq, and, gte, sql, inArray } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

// 类型别名
type TargetType = 'article' | 'teardown' | 'daily_pick' | 'news_item';

// ============================================================
// News · 资讯
// ============================================================
export const getLatestNews = unstable_cache(
  async (limit = 20) => {
    return db
      .select()
      .from(newsItems)
      .orderBy(desc(newsItems.publishedAt))
      .limit(limit);
  },
  ['latest-news'],
  { revalidate: 120, tags: ['news'] },
);

export const getNewsCount = unstable_cache(
  async () => {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(newsItems);
    return row?.count || 0;
  },
  ['news-count'],
  { revalidate: 300, tags: ['news'] },
);

export const getNewsInWindow = unstable_cache(
  async (days: number) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return db
      .select()
      .from(newsItems)
      .where(gte(newsItems.publishedAt, since))
      .orderBy(desc(newsItems.publishedAt))
      .limit(400);
  },
  ['news-in-window'],
  { revalidate: 180, tags: ['news'] },
);

// ============================================================
// Models · 模型对比
// ============================================================
export const getAllModels = unstable_cache(
  async () => {
    return db
      .select()
      .from(models)
      .orderBy(models.family, models.tier);
  },
  ['all-models'],
  { revalidate: 600, tags: ['models'] },
);

export async function getModelById(id: string) {
  const [row] = await db.select().from(models).where(eq(models.id, id));
  return row;
}

// ============================================================
// Releases · 发布事件
// ============================================================
export const getRecentReleases = unstable_cache(
  async (limit = 60) => {
    return db
      .select()
      .from(releases)
      .orderBy(desc(releases.publishedAt))
      .limit(limit);
  },
  ['recent-releases'],
  { revalidate: 300, tags: ['releases'] },
);

export const getReleaseFamilyStats = unstable_cache(
  async () => {
    const rows = await db
      .select({ family: releases.family, count: sql<number>`count(*)::int` })
      .from(releases)
      .groupBy(releases.family);
    return Object.fromEntries(rows.map((r) => [r.family, r.count]));
  },
  ['release-family-stats'],
  { revalidate: 600, tags: ['releases'] },
);

// ============================================================
// Daily Picks · 每日精选
// ============================================================
export async function getPublishedDailyPicks(limit = 20) {
  return db
    .select()
    .from(dailyPicks)
    .where(eq(dailyPicks.isDraft, false))
    .orderBy(desc(dailyPicks.pickedAt))
    .limit(limit);
}

export const getAllDailyPicks = unstable_cache(
  async (limit = 20) => {
    // 展示所有(draft + published),前端可标注 draft
    return db
      .select()
      .from(dailyPicks)
      .orderBy(desc(dailyPicks.pickedAt))
      .limit(limit);
  },
  ['all-daily-picks'],
  { revalidate: 300, tags: ['picks'] },
);

export async function getDraftPicks() {
  return db
    .select()
    .from(dailyPicks)
    .where(eq(dailyPicks.isDraft, true))
    .orderBy(desc(dailyPicks.pickedAt));
}

// ============================================================
// Articles · 洞察长文
// ============================================================
export const getPublishedArticles = unstable_cache(
  async (limit = 20) => {
    return db
      .select()
      .from(articles)
      .where(eq(articles.isDraft, false))
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  },
  ['published-articles'],
  { revalidate: 300, tags: ['articles'] },
);

export const getFeaturedArticle = unstable_cache(
  async () => {
    const [row] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.featured, true), eq(articles.isDraft, false)))
      .orderBy(desc(articles.publishedAt))
      .limit(1);
    return row;
  },
  ['featured-article'],
  { revalidate: 300, tags: ['articles'] },
);

export const getArticleBySlug = unstable_cache(
  async (slug: string) => {
    const [row] = await db.select().from(articles).where(eq(articles.slug, slug));
    return row;
  },
  ['article-by-slug'],
  { revalidate: 300, tags: ['articles'] },
);

// ============================================================
// Teardowns · 深度拆解
// ============================================================
export const getPublishedTeardowns = unstable_cache(
  async (limit = 20) => {
    return db
      .select()
      .from(teardowns)
      .orderBy(desc(teardowns.publishedAt))
      .limit(limit);
  },
  ['published-teardowns'],
  { revalidate: 300, tags: ['teardowns'] },
);

export const getTeardownBySlug = unstable_cache(
  async (slug: string) => {
    const [row] = await db.select().from(teardowns).where(eq(teardowns.slug, slug));
    return row;
  },
  ['teardown-by-slug'],
  { revalidate: 300, tags: ['teardowns'] },
);

// ============================================================
// Timeline · 迭代追踪
// ============================================================
export const getFamilyTimeline = unstable_cache(
  async (family: string) => {
    return db
      .select()
      .from(timelineVersions)
      .where(eq(timelineVersions.family, family))
      .orderBy(desc(timelineVersions.dateOrder));
  },
  ['family-timeline'],
  { revalidate: 600, tags: ['timeline'] },
);

export const getFamilyCounts = unstable_cache(
  async () => {
    const rows = await db
      .select({ family: timelineVersions.family, count: sql<number>`count(*)::int` })
      .from(timelineVersions)
      .groupBy(timelineVersions.family);
    return Object.fromEntries(rows.map((r) => [r.family, r.count]));
  },
  ['family-counts'],
  { revalidate: 600, tags: ['timeline'] },
);

// ============================================================
// Interactions · 收藏 / 点赞 / 评论
// ============================================================

/** 拿一个 (targetType, targetId) 的赞数 + 藏数 */
export async function getInteractionCounts(targetType: TargetType, targetId: string) {
  const [[l], [s], [c]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(likes).where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId))),
    db.select({ n: sql<number>`count(*)::int` }).from(saves).where(and(eq(saves.targetType, targetType), eq(saves.targetId, targetId))),
    db.select({ n: sql<number>`count(*)::int` }).from(comments).where(and(eq(comments.targetType, targetType), eq(comments.targetId, targetId))),
  ]);
  return { likes: l?.n || 0, saves: s?.n || 0, comments: c?.n || 0 };
}

/** 批量拿一批 items 的赞数 + 藏数 */
/** 批量拿一批 items 的赞数 + 藏数 · 公共数据 · 短 TTL 缓存
 *  cache key 由 (targetType, targetIds) 生成 · 相同一批 IDs 会命中 */
export const getInteractionCountsBatch = unstable_cache(
  async (targetType: TargetType, targetIds: string[]) => {
    if (targetIds.length === 0) return { likes: {}, saves: {} };
    const [likeRows, saveRows] = await Promise.all([
      db.select({ tid: likes.targetId, n: sql<number>`count(*)::int` })
        .from(likes)
        .where(and(eq(likes.targetType, targetType), inArray(likes.targetId, targetIds)))
        .groupBy(likes.targetId),
      db.select({ tid: saves.targetId, n: sql<number>`count(*)::int` })
        .from(saves)
        .where(and(eq(saves.targetType, targetType), inArray(saves.targetId, targetIds)))
        .groupBy(saves.targetId),
    ]);
    return {
      likes: Object.fromEntries(likeRows.map((r) => [r.tid, r.n])),
      saves: Object.fromEntries(saveRows.map((r) => [r.tid, r.n])),
    };
  },
  ['interaction-counts-batch'],
  { revalidate: 60, tags: ['interactions'] },
);

/** 拿这个用户对一批 items 的赞/藏状态 */
export async function getUserInteractions(userId: string, targetType: TargetType, targetIds: string[]) {
  if (targetIds.length === 0) return { likedIds: new Set<string>(), savedIds: new Set<string>() };
  const [ls, ss] = await Promise.all([
    db.select({ tid: likes.targetId })
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.targetType, targetType), inArray(likes.targetId, targetIds))),
    db.select({ tid: saves.targetId })
      .from(saves)
      .where(and(eq(saves.userId, userId), eq(saves.targetType, targetType), inArray(saves.targetId, targetIds))),
  ]);
  return {
    likedIds: new Set(ls.map((r) => r.tid)),
    savedIds: new Set(ss.map((r) => r.tid)),
  };
}

/** 拿这个用户对 (targetType, targetId) 的赞/藏状态(单个)*/
export async function getUserInteractionForItem(userId: string, targetType: TargetType, targetId: string) {
  const [l, s] = await Promise.all([
    db.select({ id: likes.id }).from(likes).where(and(eq(likes.userId, userId), eq(likes.targetType, targetType), eq(likes.targetId, targetId))).limit(1),
    db.select({ id: saves.id }).from(saves).where(and(eq(saves.userId, userId), eq(saves.targetType, targetType), eq(saves.targetId, targetId))).limit(1),
  ]);
  return { liked: l.length > 0, saved: s.length > 0 };
}

/** 拿用户全部收藏(跨类型)· 用于 /me */
export async function getUserSaves(userId: string) {
  const rows = await db
    .select()
    .from(saves)
    .where(eq(saves.userId, userId))
    .orderBy(desc(saves.createdAt));

  const byType: Record<string, string[]> = {};
  for (const r of rows) {
    if (!byType[r.targetType]) byType[r.targetType] = [];
    byType[r.targetType].push(r.targetId);
  }

  const [articleRows, teardownRows, pickRows, newsRows] = await Promise.all([
    byType.article ? db.select({ id: articles.id, slug: articles.slug, title: articles.title, category: articles.category, publishedAt: articles.publishedAt })
      .from(articles).where(inArray(articles.id, byType.article)) : Promise.resolve([]),
    byType.teardown ? db.select({ id: teardowns.id, slug: teardowns.slug, title: teardowns.title, category: teardowns.category, publishedAt: teardowns.publishedAt })
      .from(teardowns).where(inArray(teardowns.id, byType.teardown)) : Promise.resolve([]),
    byType.daily_pick ? db.select({ id: dailyPicks.id, slug: dailyPicks.slug, name: dailyPicks.name, tagline: dailyPicks.tagline, url: dailyPicks.url, category: dailyPicks.category, logo: dailyPicks.logo, logoColor: dailyPicks.logoColor })
      .from(dailyPicks).where(inArray(dailyPicks.id, byType.daily_pick)) : Promise.resolve([]),
    byType.news_item ? db.select({ id: newsItems.id, title: newsItems.title, url: newsItems.url, source: newsItems.source, publishedAt: newsItems.publishedAt, category: newsItems.category })
      .from(newsItems).where(inArray(newsItems.id, byType.news_item)) : Promise.resolve([]),
  ]);

  return {
    articles: articleRows as any[],
    teardowns: teardownRows as any[],
    daily_picks: pickRows as any[],
    news_items: newsRows as any[],
    total: rows.length,
  };
}

/** 拿用户全部点赞 · 用于 /me */
export async function getUserLikes(userId: string) {
  const rows = await db
    .select()
    .from(likes)
    .where(eq(likes.userId, userId))
    .orderBy(desc(likes.createdAt));

  const byType: Record<string, string[]> = {};
  for (const r of rows) {
    if (!byType[r.targetType]) byType[r.targetType] = [];
    byType[r.targetType].push(r.targetId);
  }

  const [articleRows, teardownRows, pickRows, newsRows] = await Promise.all([
    byType.article ? db.select({ id: articles.id, slug: articles.slug, title: articles.title, category: articles.category })
      .from(articles).where(inArray(articles.id, byType.article)) : Promise.resolve([]),
    byType.teardown ? db.select({ id: teardowns.id, slug: teardowns.slug, title: teardowns.title, category: teardowns.category })
      .from(teardowns).where(inArray(teardowns.id, byType.teardown)) : Promise.resolve([]),
    byType.daily_pick ? db.select({ id: dailyPicks.id, slug: dailyPicks.slug, name: dailyPicks.name, tagline: dailyPicks.tagline, url: dailyPicks.url })
      .from(dailyPicks).where(inArray(dailyPicks.id, byType.daily_pick)) : Promise.resolve([]),
    byType.news_item ? db.select({ id: newsItems.id, title: newsItems.title, url: newsItems.url, source: newsItems.source, publishedAt: newsItems.publishedAt })
      .from(newsItems).where(inArray(newsItems.id, byType.news_item)) : Promise.resolve([]),
  ]);

  return {
    articles: articleRows as any[],
    teardowns: teardownRows as any[],
    daily_picks: pickRows as any[],
    news_items: newsRows as any[],
    total: rows.length,
  };
}

/** 拿一个 target 的评论(树形)*/
export async function getComments(targetType: TargetType, targetId: string) {
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      userId: comments.userId,
      parentId: comments.parentId,
      isEditorPick: comments.isEditorPick,
      isHidden: comments.isHidden,
      createdAt: comments.createdAt,
      userName: userTable.name,
      userImage: userTable.image,
      userRole: userTable.role,
    })
    .from(comments)
    .leftJoin(userTable, eq(comments.userId, userTable.id))
    .where(and(eq(comments.targetType, targetType), eq(comments.targetId, targetId), eq(comments.isHidden, false)))
    .orderBy(desc(comments.createdAt));

  return rows;
}

// ============================================================
// Search · 全站搜索
// ============================================================

/**
 * 简易全站搜索:大小写不敏感的模糊匹配
 * 覆盖 articles / teardowns / daily_picks / news_items
 */
export async function searchAll(query: string) {
  const q = query.trim();
  if (!q) return { articles: [], teardowns: [], daily_picks: [], news_items: [], total: 0 };

  const pattern = `%${q}%`;
  const [articleRows, teardownRows, pickRows, newsRows] = await Promise.all([
    db.select({
      id: articles.id, slug: articles.slug, title: articles.title,
      excerpt: articles.excerpt, category: articles.category, publishedAt: articles.publishedAt,
    }).from(articles)
      .where(sql`${articles.title} ILIKE ${pattern} OR ${articles.excerpt} ILIKE ${pattern} OR ${articles.body} ILIKE ${pattern}`)
      .orderBy(desc(articles.publishedAt))
      .limit(20),

    db.select({
      id: teardowns.id, slug: teardowns.slug, title: teardowns.title,
      positioning: teardowns.positioning, category: teardowns.category, publishedAt: teardowns.publishedAt,
    }).from(teardowns)
      .where(sql`${teardowns.title} ILIKE ${pattern} OR ${teardowns.positioning} ILIKE ${pattern} OR ${teardowns.body} ILIKE ${pattern}`)
      .orderBy(desc(teardowns.publishedAt))
      .limit(20),

    db.select({
      id: dailyPicks.id, slug: dailyPicks.slug, name: dailyPicks.name,
      tagline: dailyPicks.tagline, url: dailyPicks.url, category: dailyPicks.category,
      logo: dailyPicks.logo, logoColor: dailyPicks.logoColor,
    }).from(dailyPicks)
      .where(sql`${dailyPicks.name} ILIKE ${pattern} OR ${dailyPicks.tagline} ILIKE ${pattern} OR ${dailyPicks.positioning} ILIKE ${pattern} OR ${dailyPicks.editorTake} ILIKE ${pattern}`)
      .orderBy(desc(dailyPicks.pickedAt))
      .limit(20),

    db.select({
      id: newsItems.id, title: newsItems.title, url: newsItems.url,
      source: newsItems.source, publishedAt: newsItems.publishedAt, category: newsItems.category,
    }).from(newsItems)
      .where(sql`${newsItems.title} ILIKE ${pattern} OR ${newsItems.summary} ILIKE ${pattern}`)
      .orderBy(desc(newsItems.publishedAt))
      .limit(30),
  ]);

  return {
    articles: articleRows,
    teardowns: teardownRows,
    daily_picks: pickRows,
    news_items: newsRows,
    total: articleRows.length + teardownRows.length + pickRows.length + newsRows.length,
  };
}
