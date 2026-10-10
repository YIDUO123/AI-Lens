/**
 * /daily · 每日日报公开归档(报纸式)
 * 从 news_items 按天重建"当日精选":分数降序 → 标题相似度去重 → Top 10
 * 无需订阅即可浏览往期;与每日精编同一选取口径
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { db, newsItems } from '@/db';
import { sql, desc, and, gte, lt } from 'drizzle-orm';
import { dedupeByTitle } from '@/lib/fetchers/daily-digest';
import { getNewsCards } from '@/lib/ai/news-card';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';

export const runtime = 'nodejs';
export const revalidate = 1800;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || 'https://ailens.cloud';

const CAT_LABEL: Record<string, string> = {
  'ai-models': '模型', 'ai-products': '产品', industry: '行业', paper: '论文', tip: '技巧',
};

type SP = { date?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const d = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : null;
  return {
    title: d ? `AI 日报 · ${d}` : 'AI 日报 · 每日精选归档',
    description: 'AI Lens 每日日报:当天最值得看的 10 条 AI 动态,附六维拆解,可分享的公开归档',
  };
}

export default async function DailyPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const paramDate = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : null;

  // 最新有内容的日期(北京时间)
  const [latestRow] = await db
    .select({ d: sql<string>`max((${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date)::text` })
    .from(newsItems);
  const date = paramDate && paramDate <= (latestRow?.d || '') ? paramDate : (latestRow?.d || null);

  if (!date) {
    return (
      <div className="container max-w-4xl py-20 text-center">
        <h1 className="text-3xl font-black mb-3">AI 日报</h1>
        <p className="text-sm text-muted-foreground">暂无数据 · 等第一次抓取完成后出现</p>
      </div>
    );
  }

  // 当天候选(北京时间)· 超量取,去重后取 Top 10
  const dayStart = `${date} 00:00:00+08`;
  const dayEnd = `${nextDay(date)} 00:00:00+08`;
  const candidates = await db
    .select({
      id: newsItems.id, title: newsItems.title, url: newsItems.url, summary: newsItems.summary,
      source: newsItems.source, category: newsItems.category, score: newsItems.score, publishedAt: newsItems.publishedAt,
    })
    .from(newsItems)
    .where(and(gte(newsItems.publishedAt, sql`${dayStart}::timestamptz`), lt(newsItems.publishedAt, sql`${dayEnd}::timestamptz`)))
    .orderBy(desc(newsItems.score))
    .limit(60);

  const { kept, removed } = dedupeByTitle(candidates);
  const top10 = kept.slice(0, 10);
  const cards = await getNewsCards(top10.map((i) => i.id));

  // 版面统计(当天全部条目)
  const catCounts: Record<string, number> = {};
  let sourceSet = new Set<string>();
  for (const it of candidates) {
    const c = CAT_LABEL[it.category || ''] || '其他';
    catCounts[c] = (catCounts[c] || 0) + 1;
    if (it.source) sourceSet.add(it.source);
  }

  // 期数 = 截至当天有内容的天数
  const [issueRow] = await db
    .select({ n: sql<number>`count(distinct (${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date)::int` })
    .from(newsItems)
    .where(sql`(${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date <= ${date}::date`);
  const issueNo = issueRow?.n || 1;

  // 往期归档(最近 90 天)
  const archiveRows = await db
    .select({
      d: sql<string>`(${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date::text`,
      n: sql<number>`count(*)::int`,
    })
    .from(newsItems)
    .groupBy(sql`(${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date`)
    .orderBy(sql`1 desc`)
    .limit(90);

  // 上一天 / 下一天(归档序列内)
  const idx = archiveRows.findIndex((r) => r.d === date);
  const prevDate = idx >= 0 && idx < archiveRows.length - 1 ? archiveRows[idx + 1].d : null;
  const nextDate = idx > 0 ? archiveRows[idx - 1].d : null;

  // 归档按月分组
  const months = new Map<string, { d: string; n: number }[]>();
  for (const r of archiveRows) {
    const m = r.d.slice(0, 7);
    if (!months.has(m)) months.set(m, []);
    months.get(m)!.push(r);
  }

  const [y, mo, dd] = date.split('-').map(Number);
  const weekday = '日一二三四五六'[new Date(Date.UTC(y, mo - 1, dd)).getUTCDay()];
  const headline = top10[0];
  const highlights = top10.slice(0, 3);

  return (
    <div className="container max-w-6xl py-10 pb-24">
      {/* 报头 */}
      <div className="border-b-2 border-ink pb-8 mb-8">
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">AI Lens Daily · 每日日报</div>
            <h1 className="text-5xl md:text-6xl font-black tracking-[-0.04em] leading-none mb-3">
              AI<span className="font-serif italic text-coral">日报</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {y} 年 {mo} 月 {dd} 日 · 星期{weekday} · 第 {issueNo} 期
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-ink">{top10.length}<span className="text-base font-bold text-muted-foreground ml-1">件事</span></div>
            <div className="text-xs text-muted-foreground mt-1">{sourceSet.size} 个来源 · {Object.keys(catCounts).length} 个版面 · 约 5 分钟读完</div>
            {removed > 0 && <div className="text-[11px] text-muted-foreground/70 mt-0.5">已合并 {removed} 条同事件报道</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
        {/* 正文 */}
        <main className="min-w-0">
          {/* 头条 */}
          {headline && (
            <article className="mb-10 pb-8 border-b-2 border-dashed border-line">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-ink text-background px-2 py-0.5 rounded text-[10px] font-black tracking-widest">头条</span>
                <span className="text-[11px] font-black tracking-widest uppercase text-coral">{CAT_LABEL[headline.category || ''] || '资讯'} · {headline.source}</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-black tracking-[-0.02em] leading-[1.2] mb-3.5">
                <Link href={`/news/card/${headline.id}`} className="hover:text-coral transition-colors">{headline.title}</Link>
              </h2>
              <p className="text-[15px] text-ink-soft leading-[1.85] max-w-3xl">
                {cards.get(headline.id)?.tldr || headline.summary}
              </p>
            </article>
          )}

          {/* 今日看点 */}
          {highlights.length > 1 && (
            <section className="mb-10">
              <div className="text-xs font-black tracking-widest uppercase text-coral mb-3.5 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5" /> 今日看点
              </div>
              <ol className="space-y-2.5">
                {highlights.map((it, i) => (
                  <li key={it.id}>
                    <Link href={`/news/card/${it.id}`} className="group flex items-baseline gap-3">
                      <span className={`font-serif font-black text-xl leading-none flex-shrink-0 ${i === 0 ? 'text-coral' : 'text-muted-foreground/50'}`}>{i + 1}</span>
                      <span className="text-[15px] font-bold leading-snug group-hover:text-coral transition-colors">{it.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* 版面统计 */}
          <section className="mb-10">
            <div className="text-xs font-black tracking-widest uppercase text-muted-foreground mb-2.5">本日版面</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
                <span key={cat} className="bg-bg-alt border border-line rounded-full px-3 py-1 text-xs font-bold text-ink-soft">
                  {cat} <b className="font-mono text-coral ml-1">{n}</b>
                </span>
              ))}
            </div>
          </section>

          {/* 全部 10 条 */}
          <section>
            <div className="text-xs font-black tracking-widest uppercase text-muted-foreground mb-3.5">完整榜单</div>
            <ol className="space-y-3">
              {top10.map((it, i) => (
                <li key={it.id}>
                  <Link
                    href={`/news/card/${it.id}`}
                    className="group flex items-start gap-3.5 bg-cream border-2 border-ink rounded-xl px-4 py-3.5 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition-all"
                  >
                    <span className={`flex-shrink-0 w-7 h-7 grid place-items-center rounded-lg border-2 border-ink font-serif font-black text-sm ${i === 0 ? 'bg-coral text-white' : 'bg-bg-alt text-ink'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-snug text-ink group-hover:text-coral transition-colors">
                        {it.title}
                      </span>
                      <span className="block text-[12.5px] text-ink-soft leading-relaxed line-clamp-2 mt-1">
                        {cards.get(it.id)?.tldr || it.summary}
                      </span>
                      <span className="block text-[10px] text-muted-foreground mt-1.5">
                        {CAT_LABEL[it.category || ''] || '资讯'} · {it.source}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          {/* 前后翻页 */}
          <div className="mt-10 flex justify-between items-center gap-3">
            {prevDate ? (
              <Link href={`/daily?date=${prevDate}`} className="press inline-flex items-center gap-1.5 px-4 py-2 bg-cream border-2 border-ink rounded-lg text-sm font-bold hover:-translate-y-0.5 hover:shadow-brutal-sm transition-all">
                <ArrowLeft className="w-4 h-4" /> {prevDate}
              </Link>
            ) : <span />}
            {nextDate && (
              <Link href={`/daily?date=${nextDate}`} className="press inline-flex items-center gap-1.5 px-4 py-2 bg-cream border-2 border-ink rounded-lg text-sm font-bold hover:-translate-y-0.5 hover:shadow-brutal-sm transition-all">
                {nextDate} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </main>

        {/* 往期归档 */}
        <aside className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              往期归档
              <span className="flex-1 h-px bg-line" />
            </div>
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              {[...months.entries()].map(([month, days]) => (
                <div key={month}>
                  <div className="text-xs font-black text-ink mb-1.5">{month.replace('-', ' 年 ')} 月</div>
                  <ul className="space-y-0.5">
                    {days.map((r) => (
                      <li key={r.d}>
                        <Link
                          href={`/daily?date=${r.d}`}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition ${
                            r.d === date ? 'bg-ink text-background font-bold' : 'text-ink-soft hover:bg-bg-alt hover:text-ink'
                          }`}
                        >
                          <span>{r.d.slice(8)} 日</span>
                          <span className={`font-mono text-[10px] ${r.d === date ? 'text-white/60' : 'text-muted-foreground'}`}>{r.n}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
              每天从当日全部动态中按评分选取 10 条 · 与邮件精编同口径
            </div>
          </div>
        </aside>
      </div>

      {/* SEO:结构化链接 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `AI Lens 每日日报 · 第 ${issueNo} 期`,
            date: date,
            url: `${SITE}/daily?date=${date}`,
            mainEntity: { '@type': 'ItemList', numberOfItems: top10.length },
          }),
        }}
      />
    </div>
  );
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10);
}
