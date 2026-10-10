'use client';

/**
 * 资讯页左侧栏 · 交互部分
 * 分类切换 = Link prefetch(视口内自动预取 RSC)→ 点击近乎即时;
 * 无人为延迟、无强制滚动,URL 即状态(可分享/可刷新)
 */
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

  const buildUrl = (cat: CatKey) => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    params.set('cat', cat);
    if (activeFam !== 'all') params.set('fam', activeFam);
    return `${pathname}?${params.toString()}`;
  };

  /**
   * 滚动策略:
   * - 视野已在"AI 资讯流"(#timeline)区域内 → 原地切换,并强制恢复原滚动位置
   * - 视野不在(页头/报告区等) → 切换后平滑滚到"AI 资讯流"
   * router.replace(scroll:false) 之外再加显式恢复,双保险防跳顶
   */
  const go = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    const el = document.getElementById('timeline');
    const rect = el?.getBoundingClientRect();
    const inView = !!rect && rect.top < window.innerHeight - 96 && rect.bottom > 96;
    const y = window.scrollY;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    router.replace(href, { scroll: false });
    setTimeout(() => {
      if (inView) {
        if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: 'auto' });
      } else if (el) {
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    }, 220);
  };

  return (
    <div className="space-y-8">
      {/* 资讯分类 · 桌面竖排 / 移动端横向滑动 chips */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          资讯分类
          <span className="flex-1 h-px bg-line" />
        </div>

        {/* 移动端 */}
        <ul className="lg:hidden -mx-5 px-5 flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CAT_LABELS.map((c) => {
            const isActive = activeCat === c.key;
            return (
              <li key={c.key} className="flex-shrink-0">
                <Link
                  href={buildUrl(c.key)}
                  prefetch
                  onClick={(e) => go(e, buildUrl(c.key))}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-[1.5px] text-[13px] font-semibold whitespace-nowrap transition',
                    isActive ? 'bg-ink text-background border-ink' : 'bg-cream border-line text-ink-soft',
                  )}
                >
                  <span>{c.label}</span>
                  <span className={cn('font-mono text-[10px]', isActive ? 'text-white/70' : 'text-muted-foreground')}>
                    {counts[c.key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 桌面端 */}
        <ul className="hidden lg:block space-y-1">
          {CAT_LABELS.map((c) => {
            const isActive = activeCat === c.key;
            return (
              <li key={c.key}>
                <Link
                  href={buildUrl(c.key)}
                  prefetch
                  onClick={(e) => go(e, buildUrl(c.key))}
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
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
