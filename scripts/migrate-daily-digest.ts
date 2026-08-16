/**
 * P1 · 每日精编推送地基 migration · 跑一次即可
 * 1) newsletter_subscribers 加订阅偏好字段
 * 2) 新建 news_cards 表(资讯六维卡片)
 * 运行:npx tsx scripts/migrate-daily-digest.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL 没设置');

const client = postgres(url, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log('🚀 扩展 newsletter_subscribers …');
  // 逐列 ADD · IF NOT EXISTS 保证可重复跑
  await db.execute(sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;`);
  await db.execute(sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS preferences JSONB;`);
  await db.execute(sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS feishu_id TEXT;`);
  await db.execute(sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS erp TEXT;`);
  await db.execute(sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS last_daily_sent_at TIMESTAMPTZ;`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS newsletter_user_idx ON newsletter_subscribers (user_id);`);

  console.log('🚀 建 news_cards 表 …');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS news_cards (
      id           TEXT PRIMARY KEY,
      tldr         TEXT NOT NULL,
      dims         JSONB NOT NULL,
      gen_model    TEXT,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('🚀 建 news_feedback 表 …');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS news_feedback (
      id         TEXT PRIMARY KEY,
      news_id    TEXT NOT NULL,
      user_id    TEXT REFERENCES "user"(id) ON DELETE CASCADE,
      vote       INTEGER NOT NULL,
      category   TEXT,
      source     TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS news_feedback_user_news_idx ON news_feedback (user_id, news_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS news_feedback_news_idx ON news_feedback (news_id);`);

  console.log('🚀 建 site_settings 表 …');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('✅ 完成 · newsletter_subscribers 已扩展 · news_cards / news_feedback / site_settings 已建');
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
