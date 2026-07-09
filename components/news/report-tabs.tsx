/**
 * Report Tabs · 顶部报告切换器
 * - 上方特色 tab(AI 家族动态)· 单独一栏
 * - 下方 3 tab · 今日/本周/本月
 * Client-side rendered based on URL search params
 */
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export function ReportTabs({ activeTab, activeCat, activeFam }: { activeTab: string; activeCat: string; activeFam: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildLink = (nextTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', nextTab);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <>
      {/* 特色 tab · 家族动态 */}
      <Link
        href={buildLink('releases')}
        scroll={false}
        className={`mb-4 flex items-center justify-between rounded-2xl border-2 border-ink px-6 py-4 shadow-brutal-sm transition-all relative overflow-hidden hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal ${
          activeTab === 'releases'
            ? 'bg-gradient-to-br from-coral to-gold text-white'
            : 'bg-gradient-to-br from-orange-50 to-amber-100 text-ink'
        }`}
      >
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

        <div className="flex items-center gap-4 relative">
          <span
            className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-black tracking-widest ${
              activeTab === 'releases' ? 'bg-white text-coral' : 'bg-coral text-white'
            }`}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
            LIVE
          </span>
          <span className="text-lg font-black tracking-tight">🆕 AI 家族动态</span>
        </div>

        <div className="flex items-center gap-4 relative">
          <span className={`text-xs ${activeTab === 'releases' ? 'text-white/75' : 'text-ink-soft'}`}>
            追踪 10+ AI 家族最新动作
          </span>
        </div>
      </Link>

      {/* 常规报告 tabs */}
      <div className="mb-6 flex gap-2 rounded-xl border-2 border-ink bg-cream p-1.5 shadow-brutal-sm">
        <TabButton href={buildLink('daily')} active={activeTab === 'daily'} icon="📅" label="今日" sub="Daily digest" />
        <TabButton href={buildLink('weekly')} active={activeTab === 'weekly'} icon="📆" label="本周" sub="7-day roundup" />
        <TabButton href={buildLink('monthly')} active={activeTab === 'monthly'} icon="🗓" label="本月" sub="30-day trends" />
      </div>
    </>
  );
}

function TabButton({ href, active, icon, label, sub }: { href: string; active: boolean; icon: string; label: string; sub: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg text-sm font-bold transition ${
        active ? 'bg-ink text-background' : 'text-ink-soft hover:bg-bg-alt'
      }`}
    >
      <span>{icon} {label}</span>
      <span className={`text-[10px] font-normal ${active ? 'text-white/60' : 'text-muted-foreground'}`}>
        {sub}
      </span>
    </Link>
  );
}
