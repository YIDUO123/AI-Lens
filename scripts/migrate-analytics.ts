/**
 * 建 3 张分析表(ai_call_logs · user_events · analytics_monthly_snapshots)
 * drizzle-kit push 有 bug · 用这个脚本跑一次即可
 * 运行:npx tsx scripts/migrate-analytics.ts
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
  console.log('🚀 建 analytics 3 张表…');

  // ai_call_logs
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_call_logs (
      id              TEXT PRIMARY KEY,
      use_case        TEXT NOT NULL,
      provider        TEXT NOT NULL,
      success         BOOLEAN NOT NULL,
      attempts_count  INTEGER NOT NULL DEFAULT 1,
      duration_ms     INTEGER NOT NULL DEFAULT 0,
      input_length    INTEGER NOT NULL DEFAULT 0,
      output_length   INTEGER NOT NULL DEFAULT 0,
      error_code      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS ai_call_logs_created_idx ON ai_call_logs (created_at DESC);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS ai_call_logs_usecase_idx ON ai_call_logs (use_case);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS ai_call_logs_provider_idx ON ai_call_logs (provider);`);
  console.log('  ✅ ai_call_logs');

  // user_events
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_events (
      id          TEXT PRIMARY KEY,
      event_name  TEXT NOT NULL,
      props       JSONB NOT NULL DEFAULT '{}'::jsonb,
      user_id     TEXT,
      session_id  TEXT,
      path        TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS user_events_created_idx ON user_events (created_at DESC);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS user_events_name_idx ON user_events (event_name);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS user_events_user_idx ON user_events (user_id) WHERE user_id IS NOT NULL;`);
  console.log('  ✅ user_events');

  // analytics_monthly_snapshots
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS analytics_monthly_snapshots (
      id             TEXT PRIMARY KEY,
      month          TEXT NOT NULL UNIQUE,
      ai_summary     JSONB NOT NULL DEFAULT '{}'::jsonb,
      event_summary  JSONB NOT NULL DEFAULT '{}'::jsonb,
      content_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
      meta           JSONB NOT NULL DEFAULT '{}'::jsonb,
      snapshot_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✅ analytics_monthly_snapshots');

  console.log('🎉 完成');
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
