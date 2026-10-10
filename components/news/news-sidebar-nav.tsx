'use client';

/**
 * 资讯页左侧栏 · 交互部分
 * 分类切换 = Link prefetch(视口内自动预取 RSC)→ 点击近乎即时;
 * 无人为延迟、无强制滚动,URL 即状态(可分享/可刷新)
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  const buildUrl = (cat: CatKey) => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    params.set('cat', cat);
    if (activeFam !== 'all') params.set('fam', activeFam);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      {/* 动态模块 · 横向 chips(跨页/页内切换,与竖排分类视觉区分) */}
      <div className="hidden lg:block">
        <div className="mb-2.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          动态模块
          <span className="flex-1 h-px bg-line" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { href: '#report-container', icon: '📅', label: '报告 · 速览' },
            { href: '#timeline', icon: '🕐', label: 'AI 资讯流' },
            { href: '/topics', icon: '🏷️', label: '主题聚合' },
            { href: '/hot', icon: '🔥', label: '热点榜' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-ink bg-bg-alt text-xs font-bold text-ink shadow-[2px_2px_0_rgba(26,26,26,0.15)] hover:-translate-y-0.5 hover:shadow-brutal-sm hover:bg-cream transition whitespace-nowrap"
            >
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
        </div>
      </div>

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
