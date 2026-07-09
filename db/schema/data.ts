/**
 * 自动抓取数据表
 * - news_items: 从 aihot API 拉取的 AI 资讯
 * - models: 从 OpenRouter 拉取的模型清单
 * - releases: 从 news 中抽取的发布事件
 */
import { pgTable, text, timestamp, integer, jsonb, index, doublePrecision } from 'drizzle-orm/pg-core';

// ============================================================
// news_items · AI 资讯
// ============================================================
export const newsItems = pgTable(
  'news_items',
  {
    id: text('id').primaryKey(), // 外部源的 id
    title: text('title').notNull(),
    url: text('url'),
    permalink: text('permalink'),
    summary: text('summary'),
    source: text('source'),
    category: text('category'), // ai-models | ai-products | industry | paper | tip
    score: integer('score').notNull().default(50),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    catIdx: index('news_cat_idx').on(t.category),
    pubIdx: index('news_pub_idx').on(t.publishedAt),
  }),
);

// ============================================================
// models · LLM 模型对比数据
// ============================================================
export const models = pgTable(
  'models',
  {
    id: text('id').primaryKey(), // e.g. "openai/gpt-5"
    name: text('name').notNull(),
    family: text('family').notNull(), // openai | anthropic | google
    tier: text('tier').notNull(), // flagship | pro | mid | small | creative | legacy
    modelGroup: text('model_group').notNull(), // chat | codex
    contextLength: integer('context_length').notNull().default(0),
    pricingIn: doublePrecision('pricing_in').notNull().default(0), // $/1M tokens
    pricingOut: doublePrecision('pricing_out').notNull().default(0),
    description: text('description'),
    // 手工评级 meta (可 null)
    meta: jsonb('meta').$type<{
      positioning?: string;
      released?: string;
      reasoning?: number;
      coding?: number;
      speed?: string;
      multimodal?: string;
      highlight?: string;
      limits?: string;
    }>(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    famIdx: index('models_fam_idx').on(t.family),
    groupIdx: index('models_group_idx').on(t.modelGroup),
  }),
);

// ============================================================
// releases · 从新闻抽取的发布事件
// ============================================================
export const releases = pgTable(
  'releases',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    url: text('url'),
    source: text('source'),
    summary: text('summary'),
    family: text('family').notNull(), // openai | anthropic | ...
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    famIdx: index('releases_fam_idx').on(t.family),
    pubIdx: index('releases_pub_idx').on(t.publishedAt),
  }),
);

export type NewsItem = typeof newsItems.$inferSelect;
export type Model = typeof models.$inferSelect;
export type Release = typeof releases.$inferSelect;
