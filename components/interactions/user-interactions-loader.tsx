'use client';

/**
 * 用户交互状态异步补齐(ISR 页面用)
 * 挂载后拉一次当前用户在 news_item 上的赞/藏 → 派发全局事件给各按钮认领
 * 服务端渲染因此可以完全脱离 session(/news 变回 ISR,打开速度 CDN 级)
 */
import { useEffect } from 'react';

export function UserInteractionsLoader() {
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/me/interactions', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        (window as any).__ailensLoggedIn = !!data.isLoggedIn;
        if (data.isLoggedIn) {
          window.dispatchEvent(
            new CustomEvent('ailens:interactions', {
              detail: { targetType: 'news_item', likedIds: data.likedIds || [], savedIds: data.savedIds || [] },
            }),
          );
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);
  return null;
}
