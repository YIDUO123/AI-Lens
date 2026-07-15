/**
 * 分析报告用 · 从 DB 拉取真实的埋点数据
 * 运行:npx tsx scripts/analytics-report.ts
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
  console.log('============================================================');
  console.log('AI 调用日志 · ai_call_logs · 总况');
  console.log('============================================================');
  const aiTotal = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE success)::int AS success,
      COUNT(*) FILTER (WHERE NOT success)::int AS fail,
      MIN(created_at) AS earliest,
      MAX(created_at) AS latest
    FROM ai_call_logs;
  `);
  console.log(aiTotal);
  console.log('');

  console.log('=== 按 provider 分布 ===');
  const byProvider = await db.execute(sql`
    SELECT
      provider,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE success)::int AS success,
      ROUND((COUNT(*) FILTER (WHERE success) * 1.0 / NULLIF(COUNT(*), 0))::numeric, 4) AS success_rate,
      ROUND(AVG(duration_ms) FILTER (WHERE success)::numeric, 0) AS avg_ms,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE success)::int AS p50_ms,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE success)::int AS p95_ms
    FROM ai_call_logs
    GROUP BY provider
    ORDER BY total DESC;
  `);
  console.log(byProvider);
  console.log('');

  console.log('=== 按 use_case 分布 ===');
  const byUseCase = await db.execute(sql`
    SELECT
      use_case,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE success)::int AS success,
      ROUND((COUNT(*) FILTER (WHERE success) * 1.0 / NULLIF(COUNT(*), 0))::numeric, 4) AS success_rate,
      ROUND(AVG(duration_ms) FILTER (WHERE success)::numeric, 0) AS avg_ms
    FROM ai_call_logs
    GROUP BY use_case
    ORDER BY total DESC;
  `);
  console.log(byUseCase);
  console.log('');

  console.log('=== fallback 生效次数(attempts_count 分布)===');
  const attempts = await db.execute(sql`
    SELECT
      attempts_count,
      COUNT(*)::int AS n,
      COUNT(*) FILTER (WHERE success)::int AS success
    FROM ai_call_logs
    GROUP BY attempts_count
    ORDER BY attempts_count;
  `);
  console.log(attempts);
  console.log('');

  console.log('=== 错误分布(前 5 个)===');
  const errors = await db.execute(sql`
    SELECT
      provider,
      LEFT(error_code, 60) AS error_head,
      COUNT(*)::int AS n
    FROM ai_call_logs
    WHERE NOT success AND error_code IS NOT NULL
    GROUP BY provider, error_head
    ORDER BY n DESC
    LIMIT 5;
  `);
  console.log(errors);
  console.log('');

  console.log('=== 最近 10 条 raw 日志 ===');
  const recent = await db.execute(sql`
    SELECT id, use_case, provider, success, attempts_count, duration_ms, input_length, output_length, LEFT(error_code, 40) AS err, created_at
    FROM ai_call_logs
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(recent);
  console.log('');

  console.log('============================================================');
  console.log('通用事件 · user_events · 总况');
  console.log('============================================================');
  const evTotal = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(DISTINCT event_name)::int AS unique_events,
      COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::int AS unique_sessions,
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS unique_users,
      MIN(created_at) AS earliest,
      MAX(created_at) AS latest
    FROM user_events;
  `);
  console.log(evTotal);
  console.log('');

  console.log('=== 按 event_name 分布 ===');
  const evByName = await db.execute(sql`
    SELECT event_name, COUNT(*)::int AS n
    FROM user_events
    GROUP BY event_name
    ORDER BY n DESC;
  `);
  console.log(evByName);
  console.log('');

  console.log('=== 最近 10 条 user_events ===');
  const evRecent = await db.execute(sql`
    SELECT id, event_name, props, session_id, path, created_at
    FROM user_events
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(evRecent);

  console.log('');
  console.log('============================================================');
  console.log('分析完成');
  console.log('============================================================');

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
