/**
 * 手动建 newsletter_subscribers 表 · 跑一次即可
 * 运行:npx tsx scripts/migrate-newsletter.ts
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
  console.log('🚀 建 newsletter_subscribers 表…');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id                 TEXT PRIMARY KEY,
      email              TEXT NOT NULL UNIQUE,
      unsubscribe_token  TEXT NOT NULL UNIQUE,
      verified           BOOLEAN NOT NULL DEFAULT TRUE,
      active             BOOLEAN NOT NULL DEFAULT TRUE,
      source             TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_sent_at       TIMESTAMPTZ
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS newsletter_active_idx ON newsletter_subscribers (active) WHERE active = TRUE;`);
  console.log('✅ 完成');
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
