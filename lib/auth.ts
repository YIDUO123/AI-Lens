/**
 * better-auth 服务器配置
 * - Drizzle Adapter 直连我们的 Postgres schema
 * - GitHub OAuth + 邮箱密码(双通道登录)
 * - 首次登录自动创建 user 记录,默认 role='reader'
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  // 首次登录时自动填充 role
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'reader' },
      bio: { type: 'string', required: false },
    },
  },

  // 邮箱密码登录
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // MVP 阶段先不强制验证
    minPasswordLength: 8,
  },

  // 社会化登录 · GitHub
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },

  // Session 配置
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 天
    updateAge: 60 * 60 * 24,       // 每天自动续期
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 分钟内不重复查库
    },
  },

  // 只有本站可以调用 auth API
  trustedOrigins: [
    'http://localhost:3000',
    process.env.BETTER_AUTH_URL || '',
  ].filter(Boolean),
});

export type Session = typeof auth.$Infer.Session;
