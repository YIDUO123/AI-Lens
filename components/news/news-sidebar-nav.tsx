'use client';

/**
 * 资讯页左侧栏 · 交互部分
 * 分类切换走 useTransition + router.replace(scroll:false):
 * 页面原地更新、不跳顶、无全页骨架闪烁;切换完成后平滑滚到时间线区
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type CatKey = 'all' | 'launch' | 'industry' | 'paper' | 'tip';

const CAT_LABELS: { key: CatKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'launch', label: '🚀 模型 & 产品' },
  { key: 'industry', label: '📊 行业动态' },
  { key: 'paper', label: '📄 论文研究' },
  { key: 'tip', label: '💡 技巧观点' },
];

export function NewsSidebarClient({
  counts,
  activeCat,
  activeTab,
  activeFam,
}: {
  counts: Record<CatKey, number>;
  activeCat: string;
  activeTab: string;
  activeFam: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCat, setPendingCat] = useState<CatKey | null>(null);
  const [pendingStart, setPendingStart] = useState(0);
  const scrollAfterNav = useRef(false);

  const buildUrl = (cat: CatKey) => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    params.set('cat', cat);
    if (activeFam !== 'all') params.set('fam', activeFam);
    return `${pathname}?${params.toString()}`;
  };

  const pick = (cat: CatKey) => {
    if (cat === activeCat || pendingCat) return;
    setPendingCat(cat);
    setPendingStart(Date.now());
    scrollAfterNav.current = true;
    // 至少给 240ms 的选中态反馈,避免"点了没反应"
    setTimeout(() => {
      router.replace(buildUrl(cat), { scroll: false });
    }, 240);
  };

  // 切换完成 → 平滑滚到时间线区(尊重 reduced-motion)
  useEffect(() => {
    if (!pendingCat || pendingCat !== activeCat) return;
    setPendingCat(null);
    if (!scrollAfterNav.current) return;
    scrollAfterNav.current = false;
    // 只在切换耗时较长(内容确实变了)时才滚动
    if (Date.now() - pendingStart > 400) {
      const el = document.getElementById('timeline');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }, [activeCat, pendingCat, pendingStart]);

  return (
    <div className="space-y-8">
      {/* 动态模块 · 横向 chips(页内/跨页切换,与下方竖排分类形成视觉区分) */}
      <div className="hidden lg:block">
        <div className="mb-2.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          动态模块
          <span className="flex-1 h-px bg-line" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { href: '#report-container', icon: '📅', label: '报告 · 速览' },
            { href: '#timeline', icon: '🕐', label: 'AI 资讯流' },
            { href: '/topics', icon: '🏷️', label: '主题聚合' },
            { href: '/hot', icon: '🔥', label: '热点榜' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-[1.5px] border-line bg-cream text-[11px] font-semibold text-ink-soft hover:border-ink hover:text-ink hover:-translate-y-px transition whitespace-nowrap"
            >
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 资讯分类 · 桌面竖排列表 / 移动端横向滑动 chips */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          资讯分类
          <span className="flex-1 h-px bg-line" />
        </div>

        {/* 移动端 */}
        <ul className="lg:hidden -mx-5 px-5 flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CAT_LABELS.map((c) => {
            const isActive = activeCat === c.key || pendingCat === c.key;
            return (
              <li key={c.key} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => pick(c.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-[1.5px] text-[13px] font-semibold whitespace-nowrap transition',
                    isActive ? 'bg-ink text-background border-ink' : 'bg-cream border-line text-ink-soft',
                  )}
                >
                  <span>{c.label}</span>
                  <span className={cn('font-mono text-[10px]', isActive ? 'text-white/70' : 'text-muted-foreground')}>
                    {counts[c.key]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* 桌面端 */}
        <ul className="hidden lg:block space-y-1">
          {CAT_LABELS.map((c) => {
            const isActive = activeCat === c.key || pendingCat === c.key;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => pick(c.key)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition',
                    isActive ? 'bg-ink text-background font-bold' : 'text-ink-soft hover:bg-bg-alt hover:text-ink',
                  )}
                >
                  <span>{c.label}</span>
                  <span
                    className={cn(
                      'font-mono text-[11px] px-2 py-0.5 rounded-full',
                      isActive ? 'bg-white/15 text-white/75' : 'bg-bg-alt text-muted-foreground',
                    )}
                  >
                    {counts[c.key]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
