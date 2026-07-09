'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/auth/user-menu';

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
      <Link href="/" className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink font-serif text-base font-black italic text-white"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--coral)) 0%, hsl(var(--gold)) 100%)',
            transform: 'rotate(-6deg)',
            boxShadow: '2px 2px 0 hsl(var(--ink))',
          }}
        >
          L
        </span>
        <span className="text-xl font-black tracking-tight">AI Lens</span>
      </Link>

      <div className="flex items-center gap-8">
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
        <UserMenu />
      </div>
    </nav>
  );
}
