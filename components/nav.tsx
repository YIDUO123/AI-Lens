'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/auth/user-menu';
import { LensLogo } from '@/components/lens-logo';
import { Search, Trophy, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/news', label: 'AI 资讯' },
  { href: '/teardowns', label: '产品拆解' },
  { href: '/timeline', label: '模型追踪' },
  { href: '/insights', label: '洞察专栏' },
  { href: '/about', label: '关于' },
];

export function Nav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // 滚动后给导航加阴影 + 收紧(IntersectionObserver 哨兵,不监听 scroll 事件)
  useEffect(() => {
    const sentinel = document.getElementById('nav-scroll-sentinel');
    if (!sentinel) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { rootMargin: '-1px' });
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  // 路由变化时收起移动端菜单
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <div id="nav-scroll-sentinel" aria-hidden="true" className="absolute top-0 h-px w-full pointer-events-none" />
      <nav
        className={cn(
          'sticky top-0 z-50 border-b-2 border-ink bg-background transition-shadow duration-300',
          scrolled ? 'shadow-[0_4px_0_rgba(26,26,26,0.08)]' : 'shadow-none',
        )}
      >
        <div className={cn('flex items-center justify-between px-5 md:px-10 transition-all duration-300', scrolled ? 'py-2.5' : 'py-4')}>
          <Link href="/" className="flex items-center gap-2">
            <LensLogo size={scrolled ? 40 : 52} className="transition-all duration-300" />
            <span className="text-xl font-black tracking-tight">AI Lens</span>
          </Link>

          {/* 桌面导航 */}
          <div className="hidden lg:flex items-center gap-6">
            <ul className="flex gap-8">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'border-b-2 pb-1 text-sm font-semibold transition-colors',
                      isActive(item.href)
                        ? 'border-coral text-ink'
                        : 'border-transparent text-ink-soft hover:border-coral hover:text-ink',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
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

          {/* 移动端汉堡按钮 */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/search"
              aria-label="搜索"
              className={cn(
                'p-2 rounded-full border-2 border-line hover:border-ink transition',
                pathname === '/search' && 'border-coral text-coral',
              )}
            >
              <Search className="w-4 h-4" />
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="press p-2 rounded-full border-2 border-ink bg-cream text-ink"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 移动端抽屉 */}
        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden overflow-hidden border-t border-dashed border-line bg-background"
            >
              <ul className="px-5 py-4 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'block px-3 py-2.5 rounded-lg text-sm font-semibold transition',
                        isActive(item.href)
                          ? 'bg-ink text-background'
                          : 'text-ink-soft hover:bg-bg-alt hover:text-ink',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="pt-2 border-t border-dashed border-line">
                  <Link
                    href="/leaderboard"
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition',
                      pathname === '/leaderboard' ? 'text-coral' : 'text-ink-soft hover:bg-bg-alt hover:text-ink',
                    )}
                  >
                    <Trophy className="w-4 h-4" /> 排行榜
                  </Link>
                </li>
              </ul>
              <div className="px-5 pb-4">
                <UserMenu />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
