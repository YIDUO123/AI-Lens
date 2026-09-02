/**
 * 左侧栏 · 动态模块 + 资讯分类
 * 服务端取分类计数,交互(切换)交给 NewsSidebarClient
 */
import { db, newsItems } from '@/db';
import { sql } from 'drizzle-orm';
import { NewsSidebarClient } from '@/components/news/news-sidebar-nav';

type CatKey = 'all' | 'launch' | 'industry' | 'paper' | 'tip';

// aihot 原始分类 → 我们展示分类
function mapCat(raw: string | null): CatKey {
  if (raw === 'ai-models' || raw === 'ai-products') return 'launch';
  if (raw === 'industry') return 'industry';
  if (raw === 'paper') return 'paper';
  if (raw === 'tip') return 'tip';
  return 'industry';
}

async function getCatCounts() {
  const rows = await db
    .select({
      category: newsItems.category,
      count: sql<number>`count(*)::int`,
    })
    .from(newsItems)
    .groupBy(newsItems.category);

  const counts: Record<CatKey, number> = { all: 0, launch: 0, industry: 0, paper: 0, tip: 0 };
  for (const r of rows) {
    const cat = mapCat(r.category);
    counts[cat] += r.count;
    counts.all += r.count;
  }
  return counts;
}

export async function NewsSidebar({ activeCat, activeTab, activeFam }: { activeCat: string; activeTab: string; activeFam: string }) {
  const counts = await getCatCounts();
  return <NewsSidebarClient counts={counts} activeCat={activeCat} activeTab={activeTab} activeFam={activeFam} />;
}
