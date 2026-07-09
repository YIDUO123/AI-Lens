/**
 * 从 aihot 公开 API 拉取 AI 资讯 → upsert 到 news_items 表
 * 每 30 分钟由 Vercel Cron 调用
 */
import { db, newsItems } from '@/db';
import { sql } from 'drizzle-orm';

const AIHOT_ITEMS = 'https://aihot.virxact.com/api/public/items';

interface AihotItem {
  id: string;
  title: string;
  url?: string;
  permalink?: string;
  publishedAt: string;
  summary?: string;
  source?: string;
  category?: string;
  score?: number;
}

async function paginate(mode: 'selected' | 'all', target: number): Promise<AihotItem[]> {
  const items: AihotItem[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();

  while (items.length < target) {
    const url = new URL(AIHOT_ITEMS);
    url.searchParams.set('mode', mode);
    url.searchParams.set('take', '50');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (ai-lens-fetcher)' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`aihot ${res.status}`);
    const data = (await res.json()) as { items: AihotItem[]; nextCursor: string | null; hasNext: boolean };

    for (const it of data.items || []) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        items.push(it);
      }
    }

    cursor = data.nextCursor;
    if (!data.hasNext || !cursor) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  return items.slice(0, target);
}

export async function fetchAndStoreNews(target = 200) {
  // Selected 优先,不够再从 all 补
  let items = await paginate('selected', target);
  if (items.length < target) {
    const seen = new Set(items.map((i) => i.id));
    const extras = (await paginate('all', target + 100)).filter((i) => !seen.has(i.id));
    items = items.concat(extras.slice(0, target - items.length));
  }
  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  if (items.length === 0) return { inserted: 0, updated: 0, total: 0 };

  const rows = items.map((it) => ({
    id: it.id,
    title: it.title,
    url: it.url || null,
    permalink: it.permalink || null,
    summary: it.summary || null,
    source: it.source || null,
    category: it.category || null,
    score: it.score ?? 50,
    publishedAt: new Date(it.publishedAt),
    fetchedAt: new Date(),
  }));

  // Upsert:主键冲突时更新可变字段
  await db
    .insert(newsItems)
    .values(rows)
    .onConflictDoUpdate({
      target: newsItems.id,
      set: {
        title: sql`excluded.title`,
        summary: sql`excluded.summary`,
        score: sql`excluded.score`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    });

  return { total: rows.length };
}
