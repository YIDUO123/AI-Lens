/**
 * Drizzle 客户端(单例)
 * 服务端组件、API Routes、Server Actions、CLI 脚本都用这个
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Next.js 会自动加载 .env.local
// 但独立 CLI(如 npm run db:seed)不走 Next.js,需要手动加载
if (!process.env.DATABASE_URL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });
  } catch {
    // dotenv 装了就用,没装就跳过(Next.js 环境下不需要)
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('❌ DATABASE_URL is not set. Copy .env.local.example → .env.local and fill it.');
}

declare global {
  // eslint-disable-next-line no-var
  var __postgres: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__postgres ??
  postgres(connectionString, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__postgres = client;
}

export const db = drizzle(client, { schema });
export * from './schema';
