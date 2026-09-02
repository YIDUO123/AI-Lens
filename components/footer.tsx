import Link from 'next/link';
import { LensLogo } from '@/components/lens-logo';

const FOOTER_NAV = [
  { href: '/news', label: 'AI 资讯' },
  { href: '/teardowns', label: '产品拆解' },
  { href: '/timeline', label: '模型追踪' },
  { href: '/insights', label: '洞察专栏' },
  { href: '/about', label: '关于' },
];

export function Footer() {
  return (
    <footer className="mt-32 border-t-2 border-ink bg-secondary py-12 text-sm text-ink-soft">
      <div className="mx-auto max-w-5xl px-6 flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <LensLogo size={40} />
            <span className="text-base font-black text-ink">AI Lens</span>
          </div>
          <div className="text-xs text-muted leading-relaxed">
            尝试看清 AI 产品的实质
            <br />
            数据每 30 分钟自动更新
          </div>
        </div>

        <nav aria-label="页脚导航" className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold">
          {FOOTER_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="link-underline text-ink-soft hover:text-ink transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-5xl px-6 mt-10 pt-5 border-t border-dashed border-line text-center text-xs text-muted">
        © 2026 AI Lens
      </div>
    </footer>
  );
}
