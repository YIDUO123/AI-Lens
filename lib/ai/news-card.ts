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
请用「文章概览 + STAR + 行动启示」六个维度拆解,让读者花 30 秒看概览、花 2 分钟看 STAR 就真正读懂。

资讯标题:${item.title}
资讯摘要:${item.summary || '(无摘要,请基于标题合理推断,但不要编造具体数字)'}
来源:${item.source || '未知'}

要求:
1. 中文输出 · 具体、有信息量、不说废话
2. overview(文章概览)是"一段话"(2-4 句),把这条资讯讲清楚,不是一句话标题
3. STAR 四项各 1-2 句:situation 情境背景、task 焦点/要解决什么、action 关键做法/宣布了什么、result 结果与影响
4. takeaway(行动启示)给"所以我该关注/做什么",是最有价值的部分
5. 不确定的数字不要编 · 没有就写"暂无公开数据"
6. tldr 是一句话核心(30 字内,用于列表/推送预览)
7. 严格输出 JSON · 不要 markdown 代码块包裹

输出格式:
{
  "tldr": "一句话核心",
  "dims": {
    "overview": "文章概览 · 一段话(2-4 句)讲清楚这条资讯",
    "situation": "S 情境 · 背景/发生了什么",
    "task": "T 焦点 · 要解决的问题/看点",
    "action": "A 行动 · 关键做法/宣布了什么",
    "result": "R 结果 · 带来的影响/数据/结论",
    "takeaway": "行动启示 · 所以我该关注/做什么"
  }
}`;
}

const EMPTY_DIMS: NewsCardDims = {
  overview: '', situation: '', task: '', action: '', result: '', takeaway: '',
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
      dims: { ...EMPTY_DIMS, overview: item.summary || item.title },
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

// ============================================================
// AI 深度解析 · 长文版(用户点"AI 解析"按需生成,一次生成全站共享)
// 与六维卡的定位区分:六维 = 2 分钟读懂;深度解析 = 5-8 分钟读透
// ============================================================

function buildDeepAnalysisPrompt(item: Pick<NewsItem, 'title' | 'summary' | 'source' | 'category'>): string {
  return `你是资深 AI 行业分析师,为独立媒体"AI Lens"撰写一篇新闻深度解析长文。
读者是 AI 产品经理和独立开发者:他们已经知道这条新闻是什么了,想看的是"意味着什么、怎么判断、该做什么"。

资讯标题:${item.title}
资讯摘要:${item.summary || '(无摘要)'}
来源:${item.source || '未知'}
分类:${item.category || '未知'}

写一篇 800-1200 字的中文深度解析,用 markdown,结构如下(用 ## 二级标题):

## 一句话导读
(全文最核心的判断,50 字内,不重复标题)

## 事件全景
(2-3 段:把这条新闻放进它所在的脉络里讲——这是谁、在什么背景下、做了什么、和之前比变化在哪)

## 深层解读
(2-3 段:表面之下的东西——为什么是现在?为什么是它?真实意图或行业信号是什么?敢于给出有依据的推断,推断要标注"我的判断")

## 竞争与生态影响
(1-2 段:对同赛道玩家、上下游、开发者生态分别意味着什么)

## 给 PM 的启示
(1-2 段:产品经理能从这条新闻里带走什么——选型建议、机会窗口、风险提示)

## 后续值得盯的信号
(3 条以内的 bullet:接下来几周应该观察什么来验证或推翻本文判断)

硬性要求:
1. 只依据标题、摘要和你的行业常识,不编造具体数字、报价、跑分;没有公开数据就写"暂无公开数据"
2. 你的输入信息有限,对新闻细节的展开以"合理推断 + 明确标注"的方式呈现,不要伪装成事实
3. 有观点、有态度,拒绝正确的废话;每一段读完要有"哦,原来如此"的信息增量
4. 只输出 markdown 正文,不要代码块包裹,不要开场白和结尾客套`;
}

/** 生成单条资讯的深度解析(纯计算,不落库) */
export async function generateDeepAnalysis(
  item: Pick<NewsItem, 'title' | 'summary' | 'source' | 'category'>,
): Promise<string> {
  const raw = await generateWithAI(buildDeepAnalysisPrompt(item), {
    temperature: 0.6,
    maxTokens: 4096,
    useCase: 'news_deep_analysis',
  });
  // 兜底清洗:去掉可能的代码块包裹
  return raw.trim().replace(/^```(?:markdown)?\s*/, '').replace(/\s*```$/, '');
}

/**
 * 读一条资讯的深度解析缓存
 */
export async function getDeepAnalysis(id: string): Promise<string | null> {
  const [row] = await db
    .select({ deepAnalysis: newsCards.deepAnalysis })
    .from(newsCards)
    .where(eq(newsCards.id, id))
    .limit(1);
  return row?.deepAnalysis || null;
}

/**
 * 生成并落库深度解析(与六维卡共用一行;六维不存在时同步生成,避免二次 AI 调用)
 * 返回 { markdown, sixDimFresh }:sixDimFresh 表示这次调用是否顺带补齐了六维
 */
export async function ensureDeepAnalysis(
  id: string,
): Promise<{ markdown: string } | { error: string }> {
  // 取资讯本体
  const [item] = await db
    .select({ id: newsItems.id, title: newsItems.title, summary: newsItems.summary, source: newsItems.source, category: newsItems.category })
    .from(newsItems)
    .where(eq(newsItems.id, id))
    .limit(1);
  if (!item) return { error: '资讯不存在' };

  const [row] = await db.select().from(newsCards).where(eq(newsCards.id, id)).limit(1);
  const haveDeep = !!row?.deepAnalysis;
  const haveSixDim = !!row;

  if (haveDeep) return { markdown: row!.deepAnalysis! };

  // 生成深度解析
  let markdown: string;
  try {
    markdown = await generateDeepAnalysis(item);
  } catch (e: any) {
    return { error: e?.message || 'AI 生成失败' };
  }
  if (!markdown || markdown.length < 100) return { error: 'AI 返回内容过短,请重试' };

  // 落库:已有六维行 → 只补 deep 列;没有 → 顺带生成六维(一次 AI 调用补齐两块)
  try {
    if (haveSixDim) {
      await db
        .update(newsCards)
        .set({ deepAnalysis: markdown, deepAnalysisModel: 'auto', deepAnalysisAt: new Date() })
        .where(eq(newsCards.id, id));
    } else {
      const card = await generateNewsCard(item);
      await db
        .insert(newsCards)
        .values({ id, tldr: card.tldr, dims: card.dims, genModel: 'auto', deepAnalysis: markdown, deepAnalysisModel: 'auto', deepAnalysisAt: new Date() })
        .onConflictDoUpdate({
          target: newsCards.id,
          set: { deepAnalysis: markdown, deepAnalysisModel: 'auto', deepAnalysisAt: new Date() },
        });
    }
  } catch {
    // 落库失败不阻塞返回(下次会重新生成,可接受)
  }

  return { markdown };
}
