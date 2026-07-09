import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// 显式加载 .env.local(Next.js 惯例文件名),而不是 dotenv 默认的 .env
config({ path: '.env.local' });

export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
} satisfies Config;
