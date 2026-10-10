/**
 * 事件聚合引擎 · 热点榜 / 周报共用
 * 贪心聚类:按分数降序遍历,与已有簇代表做标题相似度(Jaccard),≥0.55 归簇
 * 热度指数 = 簇内最高分 + 多报道加权 + 多来源加权(Techmeme 式"一事多源"信号)
 */
import { dedupeByTitle } from '@/lib/fetchers/daily-digest';

export type EventItem = {
  id: string;
  title: string;
  url: string | null;
  summary: string | null;
  source: string | null;
  category: string | null;
  score: number;
  publishedAt: Date | string;
};

export type EventCluster = {
  items: EventItem[];
  title: string;        // 代表标题(最高分条)
  id: string;           // 代表条目 id(跳转用)
  count: number;        // 条数
  sources: number;      // 去重来源数
  maxScore: number;
  heat: number;         // 热度指数
  firstAt: Date;
  lastAt: Date;
  latest: EventItem;    // 最新一条(最新进展用)
  buckets: number[];    // 时间分布(前半/后半各占,趋势用)
  trend: 'rising' | 'falling' | 'flat';
};

// 与 daily-digest 的 similar 相同口径:这里通过 dedupeByTitle 间接复用
function similarEnough(a: string, b: string): boolean {
  // 簇代表 vs 新标题:用去重函数的判定口径(归一化包含或 Jaccard ≥0.55)
  const { kept } = dedupeByTitle([{ title: a } as any, { title: b } as any]);
  return kept.length === 1;
}

export function clusterEvents(items: EventItem[]): EventCluster[] {
  const sorted = [...items].sort((a, b) => (b.score || 0) - (a.score || 0));
  const clusters: { items: EventItem[] }[] = [];

  for (const it of sorted) {
    let placed = false;
    for (const c of clusters) {
      if (similarEnough(c.items[0].title, it.title)) {
        c.items.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ items: [it] });
  }

  const out: EventCluster[] = clusters.map((c) => {
    const itemsSorted = [...c.items].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
    const head = [...c.items].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    const sources = new Set(itemsSorted.map((i) => i.source || '').filter(Boolean)).size;
    const times = itemsSorted.map((i) => new Date(i.publishedAt).getTime());
    const firstAt = new Date(Math.min(...times));
    const lastAt = new Date(Math.max(...times));

    // 时间分布:窗口切成 4 桶,看热度走向
    const t0 = firstAt.getTime();
    const span = Math.max(lastAt.getTime() - t0, 1);
    const buckets = [0, 0, 0, 0];
    for (const t of times) {
      buckets[Math.min(3, Math.floor(((t - t0) / span) * 4))]++;
    }
    const early = buckets[0] + buckets[1];
    const late = buckets[2] + buckets[3];
    const trend: EventCluster['trend'] =
      late > early * 1.5 ? 'rising' : early > late * 1.5 ? 'falling' : 'flat';

    // 热度:编辑评分打底 + 一事多源加权(每多一条 +15,每多一个来源 +8)
    const heat = Math.round(
      (head.score || 0) + (itemsSorted.length - 1) * 15 + Math.max(sources - 1, 0) * 8,
    );

    return {
      items: itemsSorted,
      title: head.title,
      id: head.id,
      count: itemsSorted.length,
      sources,
      maxScore: head.score || 0,
      heat,
      firstAt,
      lastAt,
      latest: itemsSorted[0],
      buckets,
      trend,
    };
  });

  return out.sort((a, b) => b.heat - a.heat);
}

/** 热度词条(榜单右侧小标签用) */
export function trendLabel(t: EventCluster['trend']): { text: string; cls: string } {
  if (t === 'rising') return { text: '↑ 升温', cls: 'text-coral' };
  if (t === 'falling') return { text: '↓ 降温', cls: 'text-muted-foreground' };
  return { text: '→ 持平', cls: 'text-teal' };
}
