/**
 * 从 HackerNews API 抽取"创投产品发布" → upsert 到 daily_picks 表
 * 每天由 Vercel Cron 调用
 * 6 维分析字段留空,is_draft=true,等待你在 admin 后台补
 */
import { db, dailyPicks } from '@/db';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface HNItem {
  id: number;
  title: string;
  url?: string;
  score?: number;
}

const HN_TOP = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const HN_ITEM = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

function classify(title: string, url = ''): string {
  const t = (title + ' ' + url).toLowerCase();
  if (/agent|copilot|assistant|automat/.test(t)) return 'ai-agent';
  if (/code|coding|dev tool|developer|ide|debug|compile|terminal/.test(t)) return 'coding';
  if (/saas|crm|billing|invoice|business|enterprise|analytics/.test(t)) return 'saas';
  if (/design|image|video|creative|art|writ|music/.test(t)) return 'creative';
  if (/productivity|workflow|note|task|planner|schedule/.test(t)) return 'productivity';
  return 'consumer';
}

const CAT_STYLE: Record<string, { logo: string; color: string }> = {
  'ai-agent':      { logo: '🤖', color: '#7C3AED' },
  'coding':        { logo: '💻', color: '#0E5C5A' },
  'saas':          { logo: '💰', color: '#16a34a' },
  'creative':      { logo: '🎨', color: '#FF6B35' },
  'productivity':  { logo: '📊', color: '#2F6FEB' },
  'consumer':      { logo: '🎯', color: '#FFB84D' },
};

const LAUNCH_KEYWORDS = /^(show hn:|launch |introducing |we built |i built |new |release)/i;

export async function fetchAndStoreDailyPicks(targetCount = 10) {
  const topRes = await fetch(HN_TOP, { cache: 'no-store' });
  const topIds: number[] = await topRes.json();

  const picks: any[] = [];
  for (const id of topIds.slice(0, 80)) {
    if (picks.length >= targetCount) break;
    try {
      const res = await fetch(HN_ITEM(id), { cache: 'no-store' });
      const it: HNItem & any = await res.json();
      if (!it || !it.url) continue;
      const title = it.title || '';
      if (!LAUNCH_KEYWORDS.test(title.toLowerCase())) continue;
      if ((it.score || 0) < 30) continue;

      const category = classify(title, it.url);
      const style = CAT_STYLE[category] || CAT_STYLE.consumer;
      const cleanName = title.replace(/^Show HN:\s*/i, '').split(/[–—-]/)[0].slice(0, 60).trim();
      const externalId = `hn-${id}`;

      picks.push({
        id: nanoid(),
        slug: externalId,
        name: cleanName,
        url: it.url,
        tagline: title.replace(/^Show HN:\s*[^–—-]+[–—-]\s*/i, '') || title,
        category,
        logo: style.logo,
        logoColor: style.color,
        source: 'Hacker News',
        externalId,
        score: Math.min(100, it.score || 0),
        pickedAt: new Date(),
        // 6 维留空
        positioning: null, painPoint: null, solution: null,
        designHighlight: null, vibeCoding: null, commercial: null,
        consensus: null, criticism: null, editorTake: null,
        isDraft: true,
      });
    } catch (e) {
      continue;
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  if (picks.length === 0) return { total: 0 };

  // 用 externalId 做去重 upsert(避免今天抓的 HN post 明天又插一次)
  await db.insert(dailyPicks).values(picks).onConflictDoNothing({
    target: dailyPicks.slug,
  });

  return { total: picks.length };
}
