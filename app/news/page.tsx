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
import Link from 'next/link';
import { Mail } from 'lucide-react';
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
        <div className="border-b-2 border-ink pt-12 pb-10 mb-10">
          <span className="inline-block bg-ink text-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest rounded mb-4">
            Daily News · 每日更新
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] mb-4">
            全球 <em className="accent">AI 资讯</em>
          </h1>
          <p className="max-w-2xl text-ink-soft leading-relaxed mb-6">
            每日追踪 200+ 条 AI 动态,来自 OpenAI、Anthropic、HuggingFace、Hacker News 等 30+ 公开信源。
            点开任意一条 → <b className="text-ink">文章概览 + STAR + 行动启示</b> 六维拆解,5 分钟读懂今天的 AI。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/me"
              className="press inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-coral to-gold text-white border-2 border-ink rounded-xl text-base font-black tracking-wide shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-lg transition-all"
            >
              <Mail className="w-5 h-5" />
              订阅每日精编
            </Link>
            <span className="text-xs text-muted-foreground">邮箱 / 微信 / 飞书 · 每天定时 10 条精选 · 可选模块与模型</span>
          </div>
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

            <div id="timeline" className="mt-8 flex items-center justify-between rounded-xl border-2 border-ink bg-cream px-5 py-3.5 shadow-brutal-sm scroll-mt-24">
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
