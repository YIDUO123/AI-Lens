/**
 * 编辑内容表
 * - articles: 洞察长文
 * - teardowns: 产品深度拆解
 * - timeline_versions: AI 家族版本条目
 * - daily_picks: 每日精选创投产品(6 维分析)
 */
import { pgTable, text, timestamp, boolean, integer, index, jsonb } from 'drizzle-orm/pg-core';
import { user } from './auth';

// ============================================================
// articles · 洞察长文
// ============================================================
export const articles = pgTable(
  'articles',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    category: text('category').notNull(), // thinking | hands-on | method | industry
    excerpt: text('excerpt'),
    cover: text('cover'),
    body: text('body').notNull(), // markdown
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull().default('AI Lens 编辑部'),
    readTime: integer('read_time').notNull().default(10), // minutes
    featured: boolean('featured').notNull().default(false),
    isDraft: boolean('is_draft').notNull().default(false),
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    // 外部观点(URL 采集器写入的字段, 为 null 表示原创)
    sourceUrl: text('source_url'),
    sourceName: text('source_name'),
    sourceAuthor: text('source_author'),
    sourceImage: text('source_image'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: index('articles_slug_idx').on(t.slug),
    catIdx: index('articles_cat_idx').on(t.category),
    pubIdx: index('articles_pub_idx').on(t.publishedAt),
  }),
);

// ============================================================
// teardowns · 产品深度拆解
// ============================================================
export const teardowns = pgTable(
  'teardowns',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    category: text('category').notNull(), // chat | coding | creative | enterprise | domestic
    positioning: text('positioning'),
    cover: text('cover'),
    body: text('body').notNull(), // markdown
    productUrl: text('product_url'),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull().default('AI Lens 编辑部'),
    readTime: integer('read_time').notNull().default(12),
    isDomestic: boolean('is_domestic').notNull().default(false),
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: index('teardowns_slug_idx').on(t.slug),
    catIdx: index('teardowns_cat_idx').on(t.category),
  }),
);

// ============================================================
// timeline_versions · AI 家族版本演化条目
// ============================================================
export const timelineVersions = pgTable(
  'timeline_versions',
  {
    id: text('id').primaryKey(),
    family: text('family').notNull(), // openai | anthropic | google | cursor | domestic
    version: text('version').notNull(),
    title: text('title').notNull(),
    dateLabel: text('date_label').notNull(), // "2026.07" 展示用
    dateOrder: timestamp('date_order', { withTimezone: true }).notNull(), // 排序用
    breakthrough: boolean('breakthrough').notNull().default(false),
    changes: jsonb('changes').notNull().$type<string[]>().default([]),
    capability: text('capability'),
    signal: text('signal'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    famIdx: index('timeline_fam_idx').on(t.family),
    dateIdx: index('timeline_date_idx').on(t.dateOrder),
  }),
);

// ============================================================
// daily_picks · 每日精选创投产品
// ============================================================
export const dailyPicks = pgTable(
  'daily_picks',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    tagline: text('tagline'),
    category: text('category').notNull(), // ai-agent | coding | productivity | creative | saas | consumer
    logo: text('logo').notNull().default('🚀'),
    logoColor: text('logo_color').notNull().default('#1a1a1a'),
    source: text('source').notNull().default('Editor pick'),
    externalId: text('external_id'), // e.g. HN id
    score: integer('score').notNull().default(80),
    pickedAt: timestamp('picked_at', { withTimezone: true }).notNull().defaultNow(),
    // 6 维分析
    positioning: text('positioning'),
    painPoint: text('pain_point'),
    solution: text('solution'),
    designHighlight: text('design_highlight'),
    vibeCoding: text('vibe_coding'),
    commercial: text('commercial'),
    // 用户声音
    consensus: text('consensus'),
    criticism: text('criticism'),
    // 编辑观点
    editorTake: text('editor_take'),
    // 编辑状态
    isDraft: boolean('is_draft').notNull().default(true), // 自动抓的默认草稿,补完 6 维后发布
    editorId: text('editor_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: index('picks_slug_idx').on(t.slug),
    catIdx: index('picks_cat_idx').on(t.category),
    dateIdx: index('picks_date_idx').on(t.pickedAt),
    draftIdx: index('picks_draft_idx').on(t.isDraft),
  }),
);

export type Article = typeof articles.$inferSelect;
export type Teardown = typeof teardowns.$inferSelect;
export type TimelineVersion = typeof timelineVersions.$inferSelect;
export type DailyPick = typeof dailyPicks.$inferSelect;
