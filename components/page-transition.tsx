'use client';

/**
 * 全局页面进入过渡
 * key=pathname → 每次路由变化时 children 重挂载,重放 CSS 淡入动画。
 * 配合各路由的 loading.tsx 骨架屏:点击 → 骨架(瞬时)→ 内容淡入,消除"硬弹出"的生硬感。
 * 尊重 prefers-reduced-motion(在 globals.css 里关掉动画)。
 */
import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
