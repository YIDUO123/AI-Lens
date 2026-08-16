'use server';

/**
 * 卡片按需加载/生成 · 供 CardBody(client)在卡片未缓存时调用
 * 缓存命中直接返回;未命中现场生成(智谱免费主力)· 不阻塞页面首屏。
 */
import { getNewsCard, ensureNewsCards } from '@/lib/ai/news-card';
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
