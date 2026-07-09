/**
 * 用户社交行为
 * - saves: 收藏(可跨类型)
 * - likes: 点赞(可跨类型)
 * - comments: 评论(支持树形回复)
 * - subscriptions: 订阅(未来邮件推送用)
 */
import { pgTable, text, timestamp, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
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
