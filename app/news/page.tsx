/**
 * AI 资讯页
 * - 顶部特色 tab · 🆕 AI 家族动态(独立一栏,珊瑚渐变)
 * - 常规 3 tab · 今日 / 本周 / 本月
 * - 左侧栏 · 动态模块 + 资讯分类
 * - 右侧 · 时间线,按日期分组
 *
 * Tab 状态通过 searchParams 保存,SEO 友好且分享有效
 */
import { Suspense } from 'react';
import { NewsSidebar } from '@/components/news/news-sidebar';
import { ReportTabs } from '@/components/news/report-tabs';
import { ReportContainer } from '@/components/news/report-container';
import { NewsTimeline } from '@/components/news/news-timeline';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const revalidate = 60;

type SP = { tab?: string; cat?: string; fam?: string };

export default async function NewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = (sp.tab as any) || 'daily';   // daily | weekly | monthly | releases
  const cat = (sp.cat as any) || 'all';     // all | launch | industry | paper | tip
  const fam = sp.fam || 'all';

  return (
    <>
      {/* 页头 */}
      <section className="container">
        <div className="border-b-2 border-ink py-15 pb-10 pt-15 mb-10">
          <span className="inline-block bg-ink text-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest rounded mb-4">
            Daily News · 每日更新
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] mb-4">
            全球 <em className="accent">AI 资讯</em>
          </h1>
          <p className="max-w-2xl text-ink-soft leading-relaxed">
            每日追踪 200+ 条 AI 动态,来自 OpenAI、Anthropic、HuggingFace、Hacker News 等 30+ 公开信源。
            每条动态可点击回到原始来源 —— 我们只做过滤和归类,不做二次改写。
          </p>
        </div>
      </section>

      <div className="container pb-20">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          {/* 左侧栏 */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-bg-alt" />}>
              <NewsSidebar activeCat={cat} activeTab={tab} activeFam={fam} />
            </Suspense>
          </aside>

          {/* 右侧内容 */}
          <main className="min-w-0">
            <ReportTabs activeTab={tab} activeCat={cat} activeFam={fam} />

            <Suspense fallback={<ReportSkeleton />}>
              <ReportContainer tab={tab} activeFam={fam} />
            </Suspense>

            <div id="timeline" className="mt-8 flex items-center justify-between rounded-xl border-2 border-ink bg-cream px-5 py-3.5 shadow-brutal-sm">
              <div className="text-sm text-ink-soft">
                时间线 · 按发布时间倒序 · 命中关键词自动标注 <b className="text-coral">PM 视角</b>
              </div>
            </div>

            <Suspense fallback={<TimelineSkeleton />}>
              <NewsTimeline activeCat={cat} />
            </Suspense>
          </main>
        </div>
      </div>
    </>
  );
}

function ReportSkeleton() {
  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-ink p-8 shadow-brutal">
      <div className="h-8 w-64 rounded bg-white/50 animate-pulse mb-4" />
      <div className="h-4 w-96 rounded bg-white/40 animate-pulse mb-6" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-white/60 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 rounded-xl border-2 border-ink/10 bg-cream animate-pulse" />
      ))}
    </div>
  );
}
