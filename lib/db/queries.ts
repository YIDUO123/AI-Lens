/**
 * 查询辅助函数
 * 服务端组件和 API 都可以用
 */
import { db, newsItems, models, releases, dailyPicks, articles, teardowns, timelineVersions } from '@/db';
import { desc, eq, and, gte, sql } from 'drizzle-orm';

// ============================================================
// News · 资讯
// ============================================================
export async function getLatestNews(limit = 20) {
  return db
    .select()
    .from(newsItems)
    .orderBy(desc(newsItems.publishedAt))
    .limit(limit);
}

export async function getNewsCount() {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(newsItems);
  return row?.count || 0;
}

export async function getNewsInWindow(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db
    .select()
    .from(newsItems)
    .where(gte(newsItems.publishedAt, since))
    .orderBy(desc(newsItems.publishedAt))
    .limit(400);
}

// ============================================================
// Models · 模型对比
// ============================================================
export async function getAllModels() {
  return db
    .select()
    .from(models)
    .orderBy(models.family, models.tier);
}

export async function getModelById(id: string) {
  const [row] = await db.select().from(models).where(eq(models.id, id));
  return row;
}

// ============================================================
// Releases · 发布事件
// ============================================================
export async function getRecentReleases(limit = 60) {
  return db
    .select()
    .from(releases)
    .orderBy(desc(releases.publishedAt))
    .limit(limit);
}

export async function getReleaseFamilyStats() {
  const rows = await db
    .select({ family: releases.family, count: sql<number>`count(*)::int` })
    .from(releases)
    .groupBy(releases.family);
  return Object.fromEntries(rows.map((r) => [r.family, r.count]));
}

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

export async function getAllDailyPicks(limit = 20) {
  // 展示所有(draft + published),前端可标注 draft
  return db
    .select()
    .from(dailyPicks)
    .orderBy(desc(dailyPicks.pickedAt))
    .limit(limit);
}

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
export async function getPublishedArticles(limit = 20) {
  return db
    .select()
    .from(articles)
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export async function getFeaturedArticle() {
  const [row] = await db
    .select()
    .from(articles)
    .where(eq(articles.featured, true))
    .orderBy(desc(articles.publishedAt))
    .limit(1);
  return row;
}

export async function getArticleBySlug(slug: string) {
  const [row] = await db.select().from(articles).where(eq(articles.slug, slug));
  return row;
}

// ============================================================
// Teardowns · 深度拆解
// ============================================================
export async function getPublishedTeardowns(limit = 20) {
  return db
    .select()
    .from(teardowns)
    .orderBy(desc(teardowns.publishedAt))
    .limit(limit);
}

export async function getTeardownBySlug(slug: string) {
  const [row] = await db.select().from(teardowns).where(eq(teardowns.slug, slug));
  return row;
}

// ============================================================
// Timeline · 迭代追踪
// ============================================================
export async function getFamilyTimeline(family: string) {
  return db
    .select()
    .from(timelineVersions)
    .where(eq(timelineVersions.family, family))
    .orderBy(desc(timelineVersions.dateOrder));
}

export async function getFamilyCounts() {
  const rows = await db
    .select({ family: timelineVersions.family, count: sql<number>`count(*)::int` })
    .from(timelineVersions)
    .groupBy(timelineVersions.family);
  return Object.fromEntries(rows.map((r) => [r.family, r.count]));
}
