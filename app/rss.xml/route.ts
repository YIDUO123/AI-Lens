/**
 * RSS 2.0 订阅源 · /rss.xml
 * 最新 50 条 AI 资讯,链接指向站内六维卡(信息增量在站内);30 分钟缓存与抓取节奏对齐
 */
import { getLatestNews } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || 'https://ailens.cloud';

const CAT_LABEL: Record<string, string> = {
  'ai-models': '模型', 'ai-products': '产品', industry: '行业', paper: '论文', tip: '技巧',
};

function esc(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  const items = await getLatestNews(50);

  const entries = items
    .map((it) => {
      const cardUrl = `${SITE}/news/card/${it.id}`;
      const title = esc(it.title);
      const summary = esc((it.summary || it.title).slice(0, 300));
      const cat = CAT_LABEL[it.category || ''] || '资讯';
      const pub = new Date(it.publishedAt).toUTCString();
      return `    <item>
      <title>${title}</title>
      <link>${esc(cardUrl)}</link>
      <guid isPermaLink="true">${esc(cardUrl)}</guid>
      <pubDate>${pub}</pubDate>
      <category>${esc(cat)}</category>
      <description>${summary}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI Lens · 每日 AI 资讯流</title>
    <link>${SITE}</link>
    <description>尝试看清 AI 产品的实质 · 30+ 信源每 30 分钟聚合,六维拆解帮你 2 分钟读懂一条</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
