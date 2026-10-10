/**
 * /topics · 主题聚合首页
 * 跨分类的关键词专题,每张卡显示近 30 天命中条数
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { db, newsItems } from '@/db';
import { sql, and, gte } from 'drizzle-orm';
import { TOPICS } from '@/lib/content/topics';
import { ModuleSwitcher } from '@/components/news/module-switcher';

export const runtime = 'nodejs';
export const revalidate = 900;

export const metadata: Metadata = {
  title: '主题聚合',
  description: '跨分类的 AI 专题:Agent 专场 · 开源动态 · 融资与资本 · 价格与成本 · Vibe Coding · 上下文与长文本',
};

async function topicCount(keywords: string[], since: Date): Promise<number> {
  const conds = keywords
    .map((k) => sql`(lower(${newsItems.title}) LIKE ${'%' + k.toLowerCase() + '%'} OR lower(coalesce(${newsItems.summary}, '')) LIKE ${'%' + k.toLowerCase() + '%'})`)
    .reduce((acc, cur) => sql`(${acc} OR ${cur})`);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(newsItems)
    .where(and(gte(newsItems.publishedAt, since), conds));
  return row?.n || 0;
}

export default async function TopicsPage() {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const counts = await Promise.all(TOPICS.map((t) => topicCount(t.keywords, since)));

  return (
    <div className="container max-w-5xl py-12 pb-24">
      <ModuleSwitcher current="topics" />

      <div className="mb-10">
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Topics · 主题聚合</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-[-0.03em] leading-tight mb-4">
          按主题看,不按<em className="accent">分类</em>看
        </h1>
        <p className="text-ink-soft leading-relaxed max-w-2xl">
          分类告诉你"这是什么类型的资讯",主题回答"我关心的事最近怎么样"。
          每个主题横跨模型 / 产品 / 行业 / 论文,近 30 天持续更新。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TOPICS.map((t, i) => (
          <Link
            key={t.slug}
            href={`/topics/${t.slug}`}
            className="group relative bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition-all overflow-hidden"
          >
            <span className="absolute top-4 right-5 font-serif text-5xl font-black text-bg-alt leading-none pointer-events-none">
              {String(counts[i]).padStart(2, '0')}
            </span>
            <span className="inline-flex w-11 h-11 border-2 border-ink rounded-xl grid place-items-center text-xl mb-4 bg-bg-alt">
              {t.icon}
            </span>
            <h2 className="relative text-xl font-black tracking-tight mb-1.5 group-hover:text-coral transition-colors">{t.title}</h2>
            <p className="relative text-[13.5px] text-ink-soft leading-relaxed mb-4">{t.desc}</p>
            <div className="relative text-[11px] font-bold text-muted-foreground border-t border-dashed border-line pt-3">
              近 30 天 <b className="font-serif text-coral text-sm">{counts[i]}</b> 条 · 持续更新 →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
