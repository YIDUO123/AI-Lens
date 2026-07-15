/**
 * 分析层表结构
 * - ai_call_logs · AI 通道每次调用日志(高价值 · 永久)
 * - user_events · 通用事件流(3 个月滚动 · 归档到 monthly_snapshots)
 * - analytics_monthly_snapshots · 月度聚合快照(永久)
 *
 * 埋点必须**永不阻塞主流程** · 所有写入用 fire-and-forget · try/catch 吞异常。
 */
import { pgTable, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';

// ============================================================
// ai_call_logs · 每次 AI 通道调用一条
// ============================================================
export const aiCallLogs = pgTable(
  'ai_call_logs',
  {
    id: text('id').primaryKey(),
    // 使用场景 · 服务侧场景标签
    useCase: text('use_case').notNull(),
    // deepseek | zhipu | groq | gemini
    provider: text('provider').notNull(),
    success: boolean('success').notNull(),
    // 该次调用是"通道链条"里的第几次尝试 · 1 = 一次就中
    attemptsCount: integer('attempts_count').notNull().default(1),
    durationMs: integer('duration_ms').notNull().default(0),
    inputLength: integer('input_length').notNull().default(0),
    outputLength: integer('output_length').notNull().default(0),
    // 失败时的错误码(可能是 HTTP status + 首行错误)
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index('ai_call_logs_created_idx').on(t.createdAt),
    useCaseIdx: index('ai_call_logs_usecase_idx').on(t.useCase),
    providerIdx: index('ai_call_logs_provider_idx').on(t.provider),
  }),
);

export type AiCallLog = typeof aiCallLogs.$inferSelect;
export type NewAiCallLog = typeof aiCallLogs.$inferInsert;

// ============================================================
// user_events · 客户端/服务端通用事件
// ============================================================
export const userEvents = pgTable(
  'user_events',
  {
    id: text('id').primaryKey(),
    eventName: text('event_name').notNull(),
    // JSON · 上限 2KB · 超过截断
    props: jsonb('props').notNull().default({}),
    // 登录用户 id · 未登录为 null
    userId: text('user_id'),
    // 匿名 session id · localStorage 存 · nanoid(12)
    sessionId: text('session_id'),
    // 来自哪个页面(url path · 不含 query)
    path: text('path'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index('user_events_created_idx').on(t.createdAt),
    eventIdx: index('user_events_name_idx').on(t.eventName),
    userIdx: index('user_events_user_idx').on(t.userId),
  }),
);

export type UserEvent = typeof userEvents.$inferSelect;
export type NewUserEvent = typeof userEvents.$inferInsert;

// ============================================================
// analytics_monthly_snapshots · 月度归档
// ============================================================
export const analyticsMonthlySnapshots = pgTable(
  'analytics_monthly_snapshots',
  {
    id: text('id').primaryKey(),
    // 格式:2026-07(YYYY-MM)
    month: text('month').notNull().unique(),
    aiSummary: jsonb('ai_summary').notNull().default({}),
    eventSummary: jsonb('event_summary').notNull().default({}),
    contentSummary: jsonb('content_summary').notNull().default({}),
    // 归档时的补充元信息(比如汇总 raw 事件条数等)
    meta: jsonb('meta').notNull().default({}),
    snapshotAt: timestamp('snapshot_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export type AnalyticsMonthlySnapshot = typeof analyticsMonthlySnapshots.$inferSelect;
