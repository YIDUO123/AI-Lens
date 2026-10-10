'use server';

/**
 * 卡片按需加载/生成 · 供 CardBody(client)在卡片未缓存时调用
 * 缓存命中直接返回;未命中现场生成(智谱免费主力)· 不阻塞页面首屏。
 */
import { getNewsCard, ensureNewsCards, getDeepAnalysis, ensureDeepAnalysis } from '@/lib/ai/news-card';
import type { NewsCardDims } from '@/db';

export async function loadNewsCard(id: string): Promise<{ tldr: string; dims: NewsCardDims } | null> {
  let card = await getNewsCard(id);
  if (!card) {
    try {
      await ensureNewsCards([id]);
      card = await getNewsCard(id);
    } catch {
      return null;
    }
  }
  return card;
}

// ---- AI 深度解析 · 简易限流(内存窗口)----
const RATE_LIMIT_ITEM = 6;
const RATE_LIMIT_GLOBAL = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateItem = new Map<string, number[]>();
const rateGlobal: number[] = [];

function rateOK(key: string): boolean {
  const now = Date.now();
  const arr = (rateItem.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_ITEM) { rateItem.set(key, arr); return false; }
  while (rateGlobal.length && now - rateGlobal[0] >= RATE_WINDOW_MS) rateGlobal.shift();
  if (rateGlobal.length >= RATE_LIMIT_GLOBAL) { rateItem.set(key, arr); return false; }
  arr.push(now);
  rateItem.set(key, arr);
  rateGlobal.push(now);
  return true;
}

/**
 * 获取或生成一条资讯的深度解析
 * - 缓存命中秒回(不限流);未命中现场生成(约 20-40s)
 * - 限流只针对"需要现场生成"的请求
 */
export async function loadDeepAnalysis(
  id: string,
): Promise<{ ok: true; markdown: string; cached: boolean } | { ok: false; error: string }> {
  // 缓存命中 → 直接返回
  try {
    const cached = await getDeepAnalysis(id);
    if (cached) return { ok: true, markdown: cached, cached: true };
  } catch {
    return { ok: false, error: '读取失败,请重试' };
  }

  if (!rateOK(id)) {
    return { ok: false, error: '解析请求太频繁了(单篇每小时 6 次 / 全站每小时 30 次),稍后再试' };
  }

  const r = await ensureDeepAnalysis(id);
  if ('error' in r) return { ok: false, error: r.error };
  return { ok: true, markdown: r.markdown, cached: false };
}
