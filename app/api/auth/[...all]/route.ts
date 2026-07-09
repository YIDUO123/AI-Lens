/**
 * better-auth 的 catch-all API 路由
 * 处理所有 /api/auth/* 请求 —— 登录、注册、登出、回调
 */
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { POST, GET } = toNextJsHandler(auth);
