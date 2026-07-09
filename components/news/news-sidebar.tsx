/**
 * 左侧栏 · 动态模块 + 资讯分类
 * 服务端组件,读取分类计数
 */
import Link from 'next/link';
import { db, newsItems } from '@/db';
import { sql } from 'drizzle-orm';

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

const CAT_LABELS: { key: CatKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'launch', label: '🚀 模型 & 产品' },
  { key: 'industry', label: '📊 行业动态' },
  { key: 'paper', label: '📄 论文研究' },
  { key: 'tip', label: '💡 技巧观点' },
];

export async function NewsSidebar({ activeCat, activeTab, activeFam }: { activeCat: string; activeTab: string; activeFam: string }) {
  const counts = await getCatCounts();

  const buildLink = (patch: { cat?: string; tab?: string }) => {
    const params = new URLSearchParams();
    params.set('tab', patch.tab ?? activeTab);
    params.set('cat', patch.cat ?? activeCat);
    if (activeFam !== 'all') params.set('fam', activeFam);
    return `/news?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      {/* 动态模块 */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          动态模块
          <span className="flex-1 h-px bg-line" />
        </div>
        <ul className="space-y-1">
          <li>
            <Link
              href="#report-container"
              className="block px-3 py-2 rounded-lg text-sm font-medium text-ink-soft hover:bg-bg-alt hover:text-ink transition"
            >
              📅 报告 · 速览
            </Link>
          </li>
          <li>
            <Link
              href="#timeline"
              className="block px-3 py-2 rounded-lg text-sm font-medium text-ink-soft hover:bg-bg-alt hover:text-ink transition"
            >
              🕐 AI 资讯流
            </Link>
          </li>
        </ul>
      </div>

      {/* 资讯分类 */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          资讯分类
          <span className="flex-1 h-px bg-line" />
        </div>
        <ul className="space-y-1">
          {CAT_LABELS.map((c) => {
            const isActive = activeCat === c.key;
            return (
              <li key={c.key}>
                <Link
                  href={buildLink({ cat: c.key })}
                  scroll={false}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive ? 'bg-ink text-background font-bold' : 'text-ink-soft hover:bg-bg-alt hover:text-ink'
                  }`}
                >
                  <span>{c.label}</span>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/15 text-white/75' : 'bg-bg-alt text-muted-foreground'
                    }`}
                  >
                    {counts[c.key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
