/**
 * /topics/[slug] · 单个主题的资讯流
 * 关键词命中近 30 天条目,分数降序 + 标题去重,30 条
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, newsItems } from '@/db';
import { sql, and, gte, desc } from 'drizzle-orm';
import { TOPICS, getTopic } from '@/lib/content/topics';
import { dedupeByTitle } from '@/lib/fetchers/daily-digest';
import { ArrowLeft } from 'lucide-react';
import { ModuleSwitcher } from '@/components/news/module-switcher';

export const runtime = 'nodejs';
export const revalidate = 900;

const CAT_LABEL: Record<string, string> = {
  'ai-models': '模型', 'ai-products': '产品', industry: '行业', paper: '论文', tip: '技巧',
};

function fmtDate(d: Date | string): string {
  const x = new Date(d);
  return `${x.getMonth() + 1}/${x.getDate()}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return { title: '主题不存在' };
  return { title: `${topic.title} · 主题聚合`, description: topic.desc };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const kw = topic.keywords;
  const conds = kw
    .map((k) => sql`(lower(${newsItems.title}) LIKE ${'%' + k.toLowerCase() + '%'} OR lower(coalesce(${newsItems.summary}, '')) LIKE ${'%' + k.toLowerCase() + '%'})`)
    .reduce((acc, cur) => sql`(${acc} OR ${cur})`);

  const rows = await db
    .select({
      id: newsItems.id, title: newsItems.title, url: newsItems.url, summary: newsItems.summary,
      source: newsItems.source, category: newsItems.category, score: newsItems.score, publishedAt: newsItems.publishedAt,
    })
    .from(newsItems)
    .where(and(gte(newsItems.publishedAt, since), conds))
    .orderBy(desc(newsItems.score))
    .limit(80);

  const { kept, removed } = dedupeByTitle(rows);
  const items = kept.slice(0, 30);

  return (
    <div className="container max-w-4xl py-10 pb-24">
      <Link href="/topics" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-4">
        <ArrowLeft className="w-4 h-4" /> 全部主题
      </Link>

      <ModuleSwitcher current="topics" />

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex w-12 h-12 border-2 border-ink rounded-xl grid place-items-center text-2xl bg-bg-alt">{topic.icon}</span>
          <h1 className="text-4xl font-black tracking-[-0.03em]">{topic.title}</h1>
        </div>
        <p className="text-ink-soft leading-relaxed max-w-2xl mb-2">{topic.desc}</p>
        <p className="text-xs text-muted-foreground">
          近 30 天 <b className="text-coral font-serif">{items.length}</b> 条命中{removed > 0 ? ` · 已合并 ${removed} 条同事件报道` : ''} · 关键词:{kw.slice(0, 4).join(' / ')}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-line rounded-2xl">
          <p className="text-sm text-muted-foreground">近 30 天暂无命中 · 主题持续监控中</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/news/card/${it.id}`}
                className="group block bg-cream border-2 border-ink rounded-xl px-4 py-3.5 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition-all"
              >
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <h2 className="text-[15px] font-bold leading-snug group-hover:text-coral transition-colors">{it.title}</h2>
                  <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground">{fmtDate(it.publishedAt)}</span>
                </div>
                <p className="text-[12.5px] text-ink-soft leading-relaxed line-clamp-1">{it.summary}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                  <span className="bg-bg-alt rounded px-1.5 py-0.5 font-bold">{CAT_LABEL[it.category || ''] || '资讯'}</span>
                  <span>{it.source}</span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
