import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * 动态模块切换条 · /hot /topics 等独立页顶部
 * 与 /news 侧栏同源的四个模块,当前项高亮,保证进入任何模块都能横向切换
 */
const MODULES = [
  { href: '/news#report-container', icon: '📅', label: '报告 · 速览', key: 'news' },
  { href: '/news#timeline', icon: '🕐', label: 'AI 资讯流', key: 'news' },
  { href: '/topics', icon: '🏷️', label: '主题聚合', key: 'topics' },
  { href: '/hot', icon: '🔥', label: '热点榜', key: 'hot' },
];

export function ModuleSwitcher({ current }: { current: 'news' | 'topics' | 'hot' }) {
  return (
    <div className="mb-8">
      <div className="mb-2.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        动态模块
        <span className="flex-1 h-px bg-line" />
      </div>
      <div className="flex flex-wrap gap-2">
        {MODULES.map((m) => {
          const isActive = m.key === current;
          return (
            <Link
              key={m.label}
              href={m.href}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 text-xs font-bold transition whitespace-nowrap',
                isActive
                  ? 'bg-ink text-background border-ink shadow-[2px_2px_0_rgba(26,26,26,0.9)]'
                  : 'bg-bg-alt text-ink border-ink/60 shadow-[2px_2px_0_rgba(26,26,26,0.15)] hover:-translate-y-0.5 hover:shadow-brutal-sm hover:bg-cream',
              )}
            >
              <span>{m.icon}</span> {m.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
