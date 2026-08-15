/**
 * P2 · 资讯六维卡片 · AI 生成
 * 输入一条资讯(标题+摘要+来源)→ 输出「读懂一条新闻」的六维拆解 + TL;DR
 * 六维偏资讯/新闻(和产品拆解的六维刻意区分):
 *   核心事实 / 关键数据 / 为什么重要 / 谁受影响 / 背景脉络 / PM视角
 *
 * 缓存策略:一条资讯生成一次,写入 news_cards,全体用户共享。
 * 只对「当天会被推送/展示的 Top 资讯」加工,不全量跑,省 AI 调用。
 */
import { db, newsItems, newsCards } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { generateWithAI } from '@/lib/ai/gemini';
import type { NewsCardDims, NewsItem } from '@/db';

function buildPrompt(item: Pick<NewsItem, 'title' | 'summary' | 'source' | 'category'>): string {
  return `你是资深 AI 行业分析师,擅长把一条 AI 资讯拆成"5 分钟读懂"的结构化卡片。
请对下面这条资讯做六维拆解,让读者花 30 秒看 TL;DR、花 2 分钟看六维就能真正读懂。

资讯标题:${item.title}
资讯摘要:${item.summary || '(无摘要,请基于标题合理推断,但不要编造具体数字)'}
来源:${item.source || '未知'}

要求:
1. 中文输出 · 每个维度 1-2 句 · 具体、有信息量、不说废话
2. 不确定的数字不要编 · 没有就写"暂无公开数据"
3. pmInsight 要给"所以我该关注/做什么"的行动启示,是这张卡片最有价值的部分
4. tldr 是一句话核心(30 字内)
5. 严格输出 JSON · 不要 markdown 代码块包裹

输出格式:
{
  "tldr": "一句话核心",
  "dims": {
    "coreFact": "核心事实 · 到底发生了什么",
    "keyData": "关键数据 · 数字/版本/时间点",
    "whyMatters": "为什么重要 · 信号与意义",
    "whoAffected": "谁受影响 · 谁赢谁输/相关产品",
    "context": "背景脉络 · 前情提要",
    "pmInsight": "PM 视角 · 行动启示"
  }
}`;
}

const EMPTY_DIMS: NewsCardDims = {
  coreFact: '', keyData: '', whyMatters: '', whoAffected: '', context: '', pmInsight: '',
};

/** 生成单条资讯的六维卡片(不落库,纯计算) */
export async function generateNewsCard(
  item: Pick<NewsItem, 'title' | 'summary' | 'source' | 'category'>,
): Promise<{ tldr: string; dims: NewsCardDims }> {
  const raw = await generateWithAI(buildPrompt(item), {
    temperature: 0.5,
    maxTokens: 1200,
    useCase: 'news_card',
  });
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    const dims = { ...EMPTY_DIMS, ...(parsed.dims || {}) };
    const tldr = String(parsed.tldr || '').trim() || item.title.slice(0, 30);
    return { tldr, dims };
  } catch {
    // AI 不听话时兜底:TL;DR 用标题,核心事实用摘要
    return {
      tldr: item.title.slice(0, 30),
      dims: { ...EMPTY_DIMS, coreFact: item.summary || item.title },
    };
  }
}

/**
 * 批量确保一组资讯都有卡片(已有的跳过 · 缺的才生成)
 * 给每日 cron 用:只加工当天要推的 Top 资讯。
 * @param ids  newsItems.id 列表
 * @param concurrency 并发上限 · 防止一次打爆 AI 通道
 */
export async function ensureNewsCards(
  ids: string[],
  concurrency: number = 3,
): Promise<{ generated: number; skipped: number; failed: number }> {
  if (!ids.length) return { generated: 0, skipped: 0, failed: 0 };

  // 已有卡片的跳过
  const existing = await db
    .select({ id: newsCards.id })
    .from(newsCards)
    .where(inArray(newsCards.id, ids));
  const have = new Set(existing.map((r) => r.id));
  const todo = ids.filter((id) => !have.has(id));
  if (!todo.length) return { generated: 0, skipped: ids.length, failed: 0 };

  // 取这些资讯的内容
  const items = await db
    .select({ id: newsItems.id, title: newsItems.title, summary: newsItems.summary, source: newsItems.source, category: newsItems.category })
    .from(newsItems)
    .where(inArray(newsItems.id, todo));

  let generated = 0, failed = 0;

  // 简单并发分批
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (it) => {
        const card = await generateNewsCard(it);
        await db
          .insert(newsCards)
          .values({ id: it.id, tldr: card.tldr, dims: card.dims, genModel: 'auto' })
          .onConflictDoNothing();
      }),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') generated++;
      else failed++;
    }
  }

  return { generated, skipped: ids.length - todo.length, failed };
}

/** 读一组资讯的卡片(网页/邮件用) */
export async function getNewsCards(ids: string[]) {
  if (!ids.length) return new Map<string, { tldr: string; dims: NewsCardDims }>();
  const rows = await db.select().from(newsCards).where(inArray(newsCards.id, ids));
  return new Map(rows.map((r) => [r.id, { tldr: r.tldr, dims: r.dims }]));
}

/** 读单条卡片 */
export async function getNewsCard(id: string) {
  const [row] = await db.select().from(newsCards).where(eq(newsCards.id, id)).limit(1);
  return row ? { tldr: row.tldr, dims: row.dims } : null;
}
