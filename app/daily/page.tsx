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
import { clusterEvents, trendLabel } from '@/lib/fetchers/events';
import { getNewsCards } from '@/lib/ai/news-card';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';

export const runtime = 'nodejs';
export const revalidate = 1800;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || 'https://ailens.cloud';

const CAT_LABEL: Record<string, string> = {
  'ai-models': '模型', 'ai-products': '产品', industry: '行业', paper: '论文', tip: '技巧',
};

type SP = { date?: string; tab?: string; w?: string };

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
  const tab = sp.tab === 'weekly' ? 'weekly' : 'daily';
  const w = Math.min(Math.max(parseInt(sp.w || '0', 10) || 0, 0), 7);

  return (
    <div className="container max-w-6xl py-10 pb-24">
      {/* 报头 */}
      <div className="border-b-2 border-ink pb-6 mb-6">
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">AI Lens Daily · 每日日报</div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.04em] leading-none">
            AI<span className="font-serif italic text-coral">日报</span>
          </h1>
          {/* 日报 | 周报 tab */}
          <div className="flex gap-1 rounded-xl border-2 border-ink bg-cream p-1 shadow-brutal-sm">
            <Link
              href="/daily"
              className={`px-4 py-1.5 rounded-lg text-sm font-black transition ${tab === 'daily' ? 'bg-ink text-background' : 'text-ink-soft hover:bg-bg-alt'}`}
            >
              日报
            </Link>
            <Link
              href="/daily?tab=weekly"
              className={`px-4 py-1.5 rounded-lg text-sm font-black transition ${tab === 'weekly' ? 'bg-ink text-background' : 'text-ink-soft hover:bg-bg-alt'}`}
            >
              周报
            </Link>
          </div>
        </div>
      </div>

      {tab === 'weekly' ? <WeeklyView w={w} /> : <DailyView date={sp.date} />}
    </div>
  );
}

// ============================================================
// 日报 · 单日 Top 10(原有逻辑)
// ============================================================
async function DailyView({ date: paramDate }: { date?: string }) {
  const [latestRow] = await db
    .select({ d: sql<string>`max((${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date)::text` })
    .from(newsItems);
  const date = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) && paramDate <= (latestRow?.d || '') ? paramDate : (latestRow?.d || null);

  if (!date) {
    return <p className="py-16 text-center text-sm text-muted-foreground">暂无数据 · 等第一次抓取完成后出现</p>;
  }

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

  const catCounts: Record<string, number> = {};
  const sourceSet = new Set<string>();
  for (const it of candidates) {
    const c = CAT_LABEL[it.category || ''] || '其他';
    catCounts[c] = (catCounts[c] || 0) + 1;
    if (it.source) sourceSet.add(it.source);
  }

  const [issueRow] = await db
    .select({ n: sql<number>`count(distinct (${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date)::int` })
    .from(newsItems)
    .where(sql`(${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date <= ${date}::date`);
  const issueNo = issueRow?.n || 1;

  const archiveRows = await db
    .select({
      d: sql<string>`(${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date::text`,
      n: sql<number>`count(*)::int`,
    })
    .from(newsItems)
    .groupBy(sql`(${newsItems.publishedAt} AT TIME ZONE 'Asia/Shanghai')::date`)
    .orderBy(sql`1 desc`)
    .limit(90);

  const idx = archiveRows.findIndex((r) => r.d === date);
  const prevDate = idx >= 0 && idx < archiveRows.length - 1 ? archiveRows[idx + 1].d : null;
  const nextDate = idx > 0 ? archiveRows[idx - 1].d : null;

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
    <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
      <main className="min-w-0">
        <div className="flex justify-between items-end flex-wrap gap-3 mb-8">
          <p className="text-sm text-muted-foreground">
            {y} 年 {mo} 月 {dd} 日 · 星期{weekday} · <b className="text-ink font-serif">第 {issueNo} 期</b>
          </p>
          <p className="text-sm text-ink-soft">
            <b className="font-serif text-2xl font-black text-ink">{top10.length}</b>
            <span className="text-muted-foreground ml-1">
              件事 · {sourceSet.size} 个来源 · 约 5 分钟读完{removed > 0 ? ` · 已合并 ${removed} 条同事件报道` : ''}
            </span>
          </p>
        </div>

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

      <DailyArchive date={date} months={months} />
    </div>
  );
}

function DailyArchive({ date, months }: { date: string; months: Map<string, { d: string; n: number }[]> }) {
  return (
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
  );
}

// ============================================================
// 周报 · 过去 7 天事件簇 Top 10(与热点榜同一聚类引擎)
// ============================================================
const WEEK_MS = 7 * 24 * 3600 * 1000;
const LAUNCH_MONDAY = Date.UTC(2026, 5, 29); // v2.0 上线那周的周一

function mondayOf(d: Date): Date {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t;
}

async function WeeklyView({ w }: { w: number }) {
  const weekStart = new Date(mondayOf(new Date()).getTime() - w * WEEK_MS);
  const weekEnd = new Date(weekStart.getTime() + WEEK_MS);

  const rows = await db
    .select({
      id: newsItems.id, title: newsItems.title, url: newsItems.url, summary: newsItems.summary,
      source: newsItems.source, category: newsItems.category, score: newsItems.score, publishedAt: newsItems.publishedAt,
    })
    .from(newsItems)
    .where(and(gte(newsItems.publishedAt, weekStart), lt(newsItems.publishedAt, weekEnd)))
    .orderBy(desc(newsItems.score))
    .limit(1200);

  const clusters = clusterEvents(rows).slice(0, 10);
  const issueNo = Math.floor((weekStart.getTime() - LAUNCH_MONDAY) / WEEK_MS) + 1;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const rangeLabel = `${fmt(weekStart).replaceAll('-', '.')} – ${fmt(new Date(weekEnd.getTime() - 86400000)).replaceAll('-', '.')}`;

  // 往期周列表(最近 8 周)
  const weekList = Array.from({ length: 8 }, (_, i) => i).filter((i) => i <= w + 8);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
      <main className="min-w-0">
        <div className="flex justify-between items-end flex-wrap gap-3 mb-8">
          <p className="text-sm text-muted-foreground">
            {rangeLabel} · <b className="text-ink font-serif">第 {issueNo} 周</b>
          </p>
          <p className="text-sm text-ink-soft">
            <b className="font-serif text-2xl font-black text-ink">{rows.length}</b>
            <span className="text-muted-foreground ml-1">条动态 · 聚合为 {clusters.length} 大事件 · 一事多源合并</span>
          </p>
        </div>

        {clusters.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">该周暂无数据</p>
        ) : (
          <ol className="space-y-3">
            {clusters.map((c, i) => {
              const t = trendLabel(c.trend);
              return (
                <li key={c.id}>
                  <Link
                    href={`/news/card/${c.id}`}
                    className="group flex items-start gap-3.5 bg-cream border-2 border-ink rounded-xl px-4 py-3.5 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition-all"
                  >
                    <span className={`flex-shrink-0 w-8 h-8 grid place-items-center rounded-lg border-2 border-ink font-serif font-black text-sm ${i === 0 ? 'bg-coral text-white' : 'bg-bg-alt text-ink'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-snug text-ink group-hover:text-coral transition-colors">
                        {c.title}
                      </span>
                      <span className="block text-[12px] text-muted-foreground mt-1">
                        {c.count} 条报道 · {c.sources} 个来源 · {t.text} · 最新 {c.latest.source}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-right">
                      <span className="block font-serif font-black text-xl text-ink leading-none">{c.heat}</span>
                      <span className="block text-[9px] font-bold tracking-widest uppercase text-muted-foreground mt-0.5">heat</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-10 flex justify-between items-center gap-3">
          {w < 7 ? (
            <Link href={`/daily?tab=weekly&w=${w + 1}`} className="press inline-flex items-center gap-1.5 px-4 py-2 bg-cream border-2 border-ink rounded-lg text-sm font-bold hover:-translate-y-0.5 hover:shadow-brutal-sm transition-all">
              <ArrowLeft className="w-4 h-4" /> 上一周
            </Link>
          ) : <span />}
          {w > 0 && (
            <Link href={`/daily?tab=weekly&w=${w - 1}`} className="press inline-flex items-center gap-1.5 px-4 py-2 bg-cream border-2 border-ink rounded-lg text-sm font-bold hover:-translate-y-0.5 hover:shadow-brutal-sm transition-all">
              下一周 <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </main>

      <aside className="min-w-0">
        <div className="lg:sticky lg:top-24">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            往期周报
            <span className="flex-1 h-px bg-line" />
          </div>
          <ul className="space-y-0.5">
            {weekList.map((i) => {
              const s = new Date(mondayOf(new Date()).getTime() - i * WEEK_MS);
              const active = i === w;
              return (
                <li key={i}>
                  <Link
                    href={`/daily?tab=weekly&w=${i}`}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition ${
                      active ? 'bg-ink text-background font-bold' : 'text-ink-soft hover:bg-bg-alt hover:text-ink'
                    }`}
                  >
                    <span>W/C {fmt(s).slice(5).replaceAll('-', '/')}</span>
                    {i === 0 && <span className="text-[10px] font-black uppercase text-coral">本周</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
            每周从 7 天动态中聚类出 10 大事件 · 与热点榜同一引擎
          </div>
        </div>
      </aside>
    </div>
  );
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10);
}
