/**
 * /hot · 热点榜 · 过去 48 小时 AI 圈讨论最多的事件
 * 事件簇聚类(一事多源合并)+ 热度指数 + 趋势,每 15 分钟重建
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { db, newsItems } from '@/db';
import { gte, desc } from 'drizzle-orm';
import { clusterEvents, trendLabel, type EventCluster } from '@/lib/fetchers/events';
import { Flame, ArrowRight, ArrowUpRight } from 'lucide-react';
import { ModuleSwitcher } from '@/components/news/module-switcher';

export const runtime = 'nodejs';
export const revalidate = 900;

export const metadata: Metadata = {
  title: 'AI 热点榜',
  description: '过去 48 小时,AI 圈讨论最多的 10 件事 · 一事多源聚合,热度指数实时排序',
};

const CAT_LABEL: Record<string, string> = {
  'ai-models': '模型', 'ai-products': '产品', industry: '行业', paper: '论文', tip: '技巧',
};

function hoursAgo(d: Date | string): string {
  const h = Math.round((Date.now() - new Date(d).getTime()) / 3600000);
  if (h < 1) return '刚刚';
  if (h < 24) return `${h} 小时前`;
  return `${Math.round(h / 24)} 天前`;
}

export default async function HotPage() {
  const since = new Date(Date.now() - 48 * 3600 * 1000);
  const rows = await db
    .select({
      id: newsItems.id, title: newsItems.title, url: newsItems.url, summary: newsItems.summary,
      source: newsItems.source, category: newsItems.category, score: newsItems.score, publishedAt: newsItems.publishedAt,
    })
    .from(newsItems)
    .where(gte(newsItems.publishedAt, since))
    .orderBy(desc(newsItems.score))
    .limit(600);

  const clusters = clusterEvents(rows).slice(0, 10);
  const totalSources = new Set(rows.map((r) => r.source).filter(Boolean)).size;
  const updatedAt = new Date();

  return (
    <div className="container max-w-5xl py-12 pb-24">
      <ModuleSwitcher current="hot" />

      {/* 页头 */}
      <div className="flex justify-between items-end flex-wrap gap-4 mb-10">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-coral mb-2">
            <Flame className="w-3.5 h-3.5" /> 实时热度
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-[-0.03em] leading-[1.1] mb-2">
            AI <em className="accent">热点榜</em>
          </h1>
          <p className="text-ink-soft leading-relaxed">
            过去 48 小时,AI 圈讨论最多的 {clusters.length} 件事 · 同一事件多源报道自动合并
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground leading-relaxed">
          {updatedAt.getHours().toString().padStart(2, '0')}:{updatedAt.getMinutes().toString().padStart(2, '0')} 更新 · 按热度指数排序
          <br />
          {rows.length} 条动态 · {totalSources} 个来源
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-line rounded-2xl">
          <Flame className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">过去 48 小时暂无数据</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* No.1 大卡 */}
          <TopClusterCard c={clusters[0]} />

          {/* No.2-3 中卡 */}
          {clusters.slice(1, 3).map((c, i) => (
            <ClusterCard key={c.id} c={c} rank={i + 2} />
          ))}

          {/* 04-10 行式 */}
          {clusters.length > 3 && (
            <>
              <div className="flex items-center justify-between pt-4 pb-1 text-xs text-muted-foreground">
                <span>继续看 No.04–{String(clusters.length).padStart(2, '0')}</span>
                <span>来源数 · 趋势 · 热度指数</span>
              </div>
              <ol className="space-y-1">
                {clusters.slice(3).map((c, i) => (
                  <ClusterRow key={c.id} c={c} rank={i + 4} />
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      <div className="mt-10 text-center text-xs text-muted-foreground">
        热度指数 = 编辑评分 + 一事多源加权(每多一条报道 +15 · 每多一个来源 +8) ·
        想 2 分钟读懂某条?去 <Link href="/news" className="text-coral font-bold underline">AI 资讯</Link> 看六维拆解
      </div>
    </div>
  );
}

function TrendSpark({ buckets }: { buckets: number[] }) {
  const max = Math.max(...buckets, 1);
  return (
    <div className="flex items-end gap-0.5 h-6" title="讨论时间分布">
      {buckets.map((n, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm ${n > 0 ? 'bg-coral/70' : 'bg-line'}`}
          style={{ height: `${Math.max((n / max) * 100, 12)}%` }}
        />
      ))}
    </div>
  );
}

function HeatBadge({ c, big }: { c: EventCluster; big?: boolean }) {
  const t = trendLabel(c.trend);
  return (
    <div className="text-right flex-shrink-0">
      <div className={`font-serif font-black leading-none ${big ? 'text-4xl' : 'text-2xl'} text-ink`}>{c.heat}</div>
      <div className={`text-[10px] font-bold ${t.cls} mt-0.5`}>{t.text}</div>
    </div>
  );
}

function TopClusterCard({ c }: { c: EventCluster }) {
  const sources = [...new Set(c.items.map((i) => i.source).filter(Boolean))];
  return (
    <article className="bg-gradient-to-br from-orange-50 to-amber-100/70 border-2 border-ink rounded-2xl p-6 md:p-7 shadow-brutal">
      <div className="flex justify-between items-start gap-4 mb-3">
        <span className="text-[10px] font-black tracking-widest uppercase text-coral">No.01</span>
        <HeatBadge c={c} big />
      </div>
      <h2 className="text-2xl md:text-3xl font-black tracking-[-0.02em] leading-[1.2] mb-3">
        <Link href={`/news/card/${c.id}`} className="hover:text-coral transition-colors">{c.title}</Link>
      </h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-4">
        <span><b className="text-ink">{c.count}</b> 条报道</span>
        <span><b className="text-ink">{c.sources}</b> 个来源</span>
        <span>最新进展 {hoursAgo(c.latest.publishedAt)}</span>
        <TrendSpark buckets={c.buckets} />
      </div>
      {c.count > 1 && (
        <div className="mb-4 text-[12.5px] leading-relaxed text-ink-soft bg-white/60 border border-dashed border-line rounded-lg px-3.5 py-2.5">
          <b className="text-coral text-[10px] font-black tracking-widest uppercase mr-1.5">最新进展</b>
          {c.latest.title.slice(0, 80)}({c.latest.source})
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
          {sources.slice(0, 6).map((s) => (
            <span key={s} className="bg-white border border-line rounded px-1.5 py-0.5 text-muted-foreground">{s}</span>
          ))}
          {sources.length > 6 && <span className="text-muted-foreground self-center">+{sources.length - 6}</span>}
        </div>
        <Link href={`/news/card/${c.id}`} className="press inline-flex items-center gap-1 px-3.5 py-1.5 bg-ink text-background rounded-lg text-xs font-black hover:bg-coral transition-colors">
          六维拆解 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}

function ClusterCard({ c, rank }: { c: EventCluster; rank: number }) {
  return (
    <article className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm hover:shadow-brutal transition-shadow">
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <span className="text-[10px] font-black tracking-widest uppercase text-coral">No.{String(rank).padStart(2, '0')}</span>
          <h2 className="text-lg font-black tracking-tight leading-snug mt-1 mb-1.5">
            <Link href={`/news/card/${c.id}`} className="hover:text-coral transition-colors">{c.title}</Link>
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{c.count} 条 · {c.sources} 源</span>
            <span>最新 {hoursAgo(c.latest.publishedAt)}</span>
            <TrendSpark buckets={c.buckets} />
          </div>
        </div>
        <HeatBadge c={c} />
      </div>
    </article>
  );
}

function ClusterRow({ c, rank }: { c: EventCluster; rank: number }) {
  return (
    <li>
      <Link
        href={`/news/card/${c.id}`}
        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-cream border-2 border-ink/60 hover:border-ink hover:-translate-y-0.5 hover:shadow-brutal-sm transition-all"
      >
        <span className="flex-shrink-0 w-8 text-center font-serif font-black text-lg text-muted-foreground/60">
          {String(rank).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-snug group-hover:text-coral transition-colors truncate">
            {c.title}
          </span>
          <span className="block text-[11px] text-muted-foreground mt-0.5">
            {c.count} 条 · {c.sources} 源 · 最新 {hoursAgo(c.latest.publishedAt)}
          </span>
        </span>
        <TrendSpark buckets={c.buckets} />
        <HeatBadge c={c} />
      </Link>
    </li>
  );
}
