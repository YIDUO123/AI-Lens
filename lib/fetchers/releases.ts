/**
 * 从 news_items 抽取"发布事件" → upsert 到 releases 表
 * 每次 news fetch 后自动调用
 */
import { db, newsItems, releases } from '@/db';
import { sql, gte } from 'drizzle-orm';

const RELEASE_TOKENS = [
  '发布', '推出', '上线', '开源',
  'release', 'launch', 'announce', 'introducing', 'unveil', 'now available', 'shipped', 'debut',
];
const EXCLUDE_TOKENS = ['融资', '收购', '离职'];

const FAMILIES: Record<string, string[]> = {
  openai:     ['openai', 'gpt-', 'chatgpt', 'sora', 'dall-e', 'codex'],
  anthropic:  ['anthropic', 'claude'],
  google:     ['google', 'gemini', 'bard', 'deepmind'],
  meta:       ['meta ', 'llama'],
  mistral:    ['mistral'],
  deepseek:   ['deepseek'],
  qwen:       ['qwen', '通义'],
  bytedance:  ['豆包', 'bytedance', 'doubao', '字节'],
  kimi:       ['kimi', '月之暗面'],
  cursor:     ['cursor'],
  perplexity: ['perplexity'],
  xai:        ['grok', 'xai'],
  huggingface:['huggingface', 'hugging face'],
};

function detectFamily(text: string): string | null {
  const t = text.toLowerCase();
  for (const [fam, kws] of Object.entries(FAMILIES)) {
    if (kws.some((k) => t.includes(k))) return fam;
  }
  return null;
}

export async function extractAndStoreReleases(daysBack = 30) {
  // 只处理最近 30 天的新闻,避免每次全表扫描
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const items = await db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      url: newsItems.url,
      permalink: newsItems.permalink,
      summary: newsItems.summary,
      source: newsItems.source,
      publishedAt: newsItems.publishedAt,
    })
    .from(newsItems)
    .where(gte(newsItems.publishedAt, since))
    .orderBy(sql`${newsItems.publishedAt} DESC`)
    .limit(400);

  const rows: any[] = [];
  for (const it of items) {
    const text = ((it.title || '') + ' ' + (it.summary || '')).toLowerCase();
    if (!RELEASE_TOKENS.some((t) => text.includes(t))) continue;
    if (EXCLUDE_TOKENS.some((t) => text.includes(t))) continue;
    const family = detectFamily(text);
    if (!family) continue;
    rows.push({
      id: it.id,
      title: it.title,
      url: it.url || it.permalink,
      source: it.source,
      summary: (it.summary || '').slice(0, 200),
      family,
      publishedAt: it.publishedAt,
      detectedAt: new Date(),
    });
  }

  if (rows.length === 0) return { total: 0 };

  await db.insert(releases).values(rows).onConflictDoUpdate({
    target: releases.id,
    set: {
      title: sql`excluded.title`,
      summary: sql`excluded.summary`,
      family: sql`excluded.family`,
      detectedAt: sql`excluded.detected_at`,
    },
  });

  return { total: rows.length };
}
