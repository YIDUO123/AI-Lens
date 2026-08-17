/**
 * 用户社交行为
 * - saves: 收藏(可跨类型)
 * - likes: 点赞(可跨类型)
 * - comments: 评论(支持树形回复)
 * - subscriptions: 订阅(未来邮件推送用)
 */
import { pgTable, text, timestamp, index, uniqueIndex, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { user } from './auth';

// 通用:target_type + target_id 指向 articles / teardowns / daily_picks
// 这是"多态"关联,牺牲一点数据库层面 FK 约束换灵活性

// ============================================================
// saves · 收藏
// ============================================================
export const saves = pgTable(
  'saves',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(), // article | teardown | daily_pick
    targetId: text('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('saves_user_idx').on(t.userId),
    uniq: uniqueIndex('saves_uniq').on(t.userId, t.targetType, t.targetId),
  }),
);

// ============================================================
// likes · 点赞
// ============================================================
export const likes = pgTable(
  'likes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('likes_user_idx').on(t.userId),
    targetIdx: index('likes_target_idx').on(t.targetType, t.targetId),
    uniq: uniqueIndex('likes_uniq').on(t.userId, t.targetType, t.targetId),
  }),
);

// ============================================================
// comments · 评论(支持树形)
// ============================================================
export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    parentId: text('parent_id'), // 树形回复,自引用
    body: text('body').notNull(),
    isEditorPick: boolean('is_editor_pick').notNull().default(false),
    isHidden: boolean('is_hidden').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('comments_user_idx').on(t.userId),
    targetIdx: index('comments_target_idx').on(t.targetType, t.targetId),
    parentIdx: index('comments_parent_idx').on(t.parentId),
  }),
);

// ============================================================
// subscriptions · 订阅(留给未来的邮件推送)
// ============================================================
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(),
  // 订阅什么类别
  categories: text('categories').array(), // ['insights', 'daily_picks', 'timeline']
  // 频率
  frequency: text('frequency').notNull().default('weekly'), // daily | weekly | monthly
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Save = typeof saves.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

// ============================================================
// 邮件订阅 · 不需要注册账号 · 邮箱即可订阅 Newsletter
// 也承载「每日资讯精编推送」的订阅偏好(P1+)
// ============================================================
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  // 用来生成 unsubscribe 链接 · 收件人一键退订
  unsubscribeToken: text('unsubscribe_token').notNull().unique(),
  // 是否验证过邮箱(未来加 double opt-in)
  verified: boolean('verified').notNull().default(true),
  // 退订就 soft-delete · 保留数据但不再发信
  active: boolean('active').notNull().default(true),
  // 来源标记(哪个页面订阅的)
  source: text('source'), // home | insights | footer | modal | daily

  // ---- 每日精编推送 · 订阅偏好 ----
  // 登录用户关联(邮箱订阅者为 null)· 用于 /me 管理偏好
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  // 订阅偏好 · 见 DigestPreferences 类型
  preferences: jsonb('preferences').$type<DigestPreferences>(),
  // 渠道身份 · 绑定后写入(JD 内部 京me/飞书 可用 ERP 反查)
  feishuId: text('feishu_id'),
  erp: text('erp'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // 周报发送时间(旧字段 · 保留兼容)
  lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
  // 每日精编推送的防重发标记(和周报分开)
  lastDailySentAt: timestamp('last_daily_sent_at', { withTimezone: true }),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

// 订阅偏好 · 存在 newsletterSubscribers.preferences
export type DigestPreferences = {
  // 感兴趣的模块(newsItems.category):ai-models | ai-products | industry | paper | tip
  // 空数组 = 不限模块(默认全站)
  modules: string[];
  // 感兴趣的 AI 模型/家族关键词:claude | gpt | gemini | deepseek | qwen ...
  // 空数组 = 不限
  models: string[];
  // 每日发送时间 · 整点/半点 · 北京时间 "09:00"
  sendTime: string;
  // 推送渠道 · 可多选
  channels: Array<'email' | 'feishu' | 'jdme'>;
  // 内容形态:brief=只发编排晨报 · cards=六维卡片 · both=晨报+点进网页看卡片
  format: 'brief' | 'cards' | 'both';
  // 频率(daily 为本功能核心 · weekly 走旧周报)
  frequency: 'daily' | 'weekly';
};

// 订阅偏好的默认值 · 首次订阅时写入
export const DEFAULT_DIGEST_PREFERENCES: DigestPreferences = {
  modules: [],
  models: [],
  sendTime: '09:00',
  channels: ['email'],
  format: 'both',
  frequency: 'daily',
};

// ============================================================
// news_cards · 资讯六维拆解卡片
// 一条资讯生成一次 · 全体用户共享(不按用户重复生成 · 省 AI 调用)
// 六维偏「读懂一条新闻」· 和产品拆解的六维刻意区分
// ============================================================
export const newsCards = pgTable('news_cards', {
  // = newsItems.id · 一对一
  id: text('id').primaryKey(),
  // 一句话核心(TL;DR)· 邮件/推送里就发这个
  tldr: text('tldr').notNull(),
  // 六维 · 网页展开时看
  dims: jsonb('dims').notNull().$type<NewsCardDims>(),
  // 哪个 AI 通道生成的 · 便于排查
  genModel: text('gen_model'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type NewsCard = typeof newsCards.$inferSelect;
// 资讯六维 · 文章概览 + STAR + 行动启示
export type NewsCardDims = {
  overview: string;   // 文章概览 · 一段话讲清楚
  situation: string;  // S · 情境 · 背景/发生了什么
  task: string;       // T · 焦点 · 要解决的问题/看点
  action: string;     // A · 行动 · 关键做法/宣布了什么
  result: string;     // R · 结果 · 带来的影响/数据/结论
  takeaway: string;   // 行动启示 · 所以我该关注/做什么
};

// ============================================================
// news_feedback · 资讯有用/没用反馈
// 用于「滤镜越用越准」:命中偏好但被 👎 的类别/来源后续降权
// ============================================================
export const newsFeedback = pgTable('news_feedback', {
  id: text('id').primaryKey(),
  newsId: text('news_id').notNull(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  vote: integer('vote').notNull(), // +1 有用 / -1 没用
  // 冗余存类别/来源 · 方便做偏好校准聚合
  category: text('category'),
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // 一个登录用户对一条资讯只留一票(靠 action 里 upsert 保证)
  userNewsIdx: uniqueIndex('news_feedback_user_news_idx').on(t.userId, t.newsId),
  newsIdx: index('news_feedback_news_idx').on(t.newsId),
}));

export type NewsFeedback = typeof newsFeedback.$inferSelect;

// ============================================================
// site_settings · 站点级开关/配置(键值)
// 例:donation_enabled=true/false 控制打赏泡泡展示
// ============================================================
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
