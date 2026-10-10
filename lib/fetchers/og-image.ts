/**
 * 资讯封面图 · OG image 抓取 + KV 存储(零迁移)
 * - 抓取:只对新入库条目跑,并发 4,单条 4s 超时,失败静默跳过(无图 = 保持原版式)
 * - 存储:site_settings 键值,key = og:{newsId}
 * - 读取:批量 inArray,时间线/卡片页一次查询
 */
import { db, siteSettings } from '@/db';
import { inArray } from 'drizzle-orm';

const KEY = (id: string) => `og:${id}`;

/** 从 HTML 里抠 og:image / twitter:image */
function extractOgImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      let url = m[1].replace(/&amp;/g, '&').trim();
      if (!/^https?:\/\//i.test(url)) {
        // 相对路径 → 尝试补全(没有域名的丢掉)
        if (url.startsWith('//')) url = 'https:' + url;
        else return null;
      }
      if (url.length > 1000) return null;
      return url;
    }
  }
  return null;
}

async function fetchOne(id: string, url: string): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ai-lens-bot; cover-fetch)' },
      cache: 'no-store',
    });
    if (!res.ok) return;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('html')) return;
    // 只读前 120KB 足够拿到 <head> 里的 meta
    const reader = res.body?.getReader();
    if (!reader) return;
    let html = '';
    let received = 0;
    const decoder = new TextDecoder();
    while (received < 120_000) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      html += decoder.decode(value, { stream: true });
      if (html.includes('</head>') || html.includes('<body')) break;
    }
    await reader.cancel().catch(() => {});
    const img = extractOgImage(html);
    if (img) {
      await db
        .insert(siteSettings)
        .values({ key: KEY(id), value: img })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: img, updatedAt: new Date() } });
    }
  } catch {
    // 任何失败(超时/反爬/解析)→ 无图,静默
  } finally {
    clearTimeout(timer);
  }
}

/** 抓一批新条目的封面图(并发 4)· cron 里 await,总量受 limit 约束 */
export async function fetchOgImages(items: { id: string; url: string | null }[], limit = 12): Promise<number> {
  const todo = items.filter((i) => i.url && /^https?:\/\//i.test(i.url)).slice(0, limit);
  let done = 0;
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.allSettled(todo.slice(i, i + 4).map((it) => fetchOne(it.id, it.url!).then(() => { done++; })));
  }
  return done;
}

/** 批量读封面图 · 返回 id → url */
export async function getOgImages(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  try {
    const rows = await db
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(inArray(siteSettings.key, ids.map(KEY)));
    return new Map(rows.map((r) => [r.key.slice(3), r.value]));
  } catch {
    return new Map();
  }
}
