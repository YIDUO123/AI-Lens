/**
 * Report Tabs · 顶部报告切换器
 * - 上方特色 tab(AI 家族动态)· 单独一栏
 * - 下方 3 tab · 今日/本周/本月
 *
 * Client-side · 用 useTransition 让 tab 切换有即时视觉反馈(过渡期灰化 + 显示 loading)
 * 减少中国用户点了 tab 之后"啥也没变"的空白等待感
 */
'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function ReportTabs({ activeTab, activeCat, activeFam }: { activeTab: string; activeCat: string; activeFam: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const buildLink = (nextTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', nextTab);
    return `${pathname}?${params.toString()}`;
  };

  // 用 startTransition 包一层 · 让 UI 立刻有反应 · 避免"点了没反应"的空白等待
  const nav = (nextTab: string) => {
    if (nextTab === activeTab) return;
    startTransition(() => {
      router.replace(buildLink(nextTab), { scroll: false });
    });
  };

  return (
    <>
      {/* 特色 tab · 家族动态 */}
      <button
        type="button"
        onClick={() => nav('releases')}
        className={`w-full mb-4 flex items-center justify-between rounded-2xl border-2 border-ink px-6 py-4 shadow-brutal-sm transition-all relative overflow-hidden hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal ${
          activeTab === 'releases'
            ? 'bg-gradient-to-br from-coral to-gold text-white'
            : 'bg-gradient-to-br from-orange-50 to-amber-100 text-ink'
        } ${isPending ? 'opacity-70' : ''}`}
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
          {isPending && activeTab !== 'releases' && <Loader2 className="w-4 h-4 animate-spin" />}
          <span className={`text-xs ${activeTab === 'releases' ? 'text-white/75' : 'text-ink-soft'}`}>
            追踪 10+ AI 家族最新动作
          </span>
        </div>
      </button>

      {/* 常规报告 tabs */}
      <div className={`mb-6 flex gap-2 rounded-xl border-2 border-ink bg-cream p-1.5 shadow-brutal-sm ${isPending ? 'opacity-80' : ''}`}>
        <TabButton onClick={() => nav('daily')}   active={activeTab === 'daily'}   pending={isPending && activeTab !== 'daily'}   icon="📅" label="今日" sub="Daily digest" />
        <TabButton onClick={() => nav('weekly')}  active={activeTab === 'weekly'}  pending={isPending && activeTab !== 'weekly'}  icon="📆" label="本周" sub="7-day roundup" />
        <TabButton onClick={() => nav('monthly')} active={activeTab === 'monthly'} pending={isPending && activeTab !== 'monthly'} icon="🗓" label="本月" sub="30-day trends" />
      </div>
    </>
  );
}

function TabButton({
  onClick, active, pending, icon, label, sub,
}: { onClick: () => void; active: boolean; pending: boolean; icon: string; label: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg text-sm font-bold transition relative ${
        active ? 'bg-ink text-background' : 'text-ink-soft hover:bg-bg-alt'
      }`}
    >
      <span className="flex items-center gap-1.5">
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>{icon}</span>}
        <span>{label}</span>
      </span>
      <span className={`text-[10px] font-normal ${active ? 'text-white/60' : 'text-muted-foreground'}`}>
        {sub}
      </span>
    </button>
  );
}
