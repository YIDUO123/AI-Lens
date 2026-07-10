'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/auth/user-menu';
import { LensLogo } from '@/components/lens-logo';
import { Search, Trophy } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/news', label: 'AI 资讯' },
  { href: '/teardowns', label: '产品拆解' },
  { href: '/timeline', label: '迭代追踪' },
  { href: '/insights', label: '洞察专栏' },
  { href: '/about', label: '关于' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b-2 border-ink bg-background px-10 py-4">
      <Link href="/" className="flex items-center gap-2">
        <LensLogo size={52} />
        <span className="text-xl font-black tracking-tight">AI Lens</span>
      </Link>

      <div className="flex items-center gap-6">
        <ul className="flex gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'border-b-2 pb-1 text-sm font-semibold transition-colors',
                    isActive
                      ? 'border-coral text-ink'
                      : 'border-transparent text-ink-soft hover:border-coral hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 排行榜 */}
        <Link
          href="/leaderboard"
          aria-label="排行榜"
          className={cn(
            'p-2 rounded-full border-2 border-line hover:border-ink hover:bg-bg-alt transition',
            pathname === '/leaderboard' && 'border-coral text-coral',
          )}
        >
          <Trophy className="w-4 h-4" />
        </Link>

        {/* 搜索图标 */}
        <Link
          href="/search"
          aria-label="搜索"
          className={cn(
            'p-2 rounded-full border-2 border-line hover:border-ink hover:bg-bg-alt transition',
            pathname === '/search' && 'border-coral text-coral',
          )}
        >
          <Search className="w-4 h-4" />
        </Link>

        <UserMenu />
      </div>
    </nav>
  );
}
