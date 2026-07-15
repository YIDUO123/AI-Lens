'use client';

/**
 * 客户端埋点 · 统一入口
 *
 * 用法:
 *   import { track } from '@/lib/analytics/track-client';
 *   track('newsletter_subscribe', { source: 'home' });
 *
 * 内部:
 *   1. 调 Vercel Analytics track()(免费 2500 events/月 · 面板可视化)
 *   2. POST 到 /api/analytics/log · 落 DB(永久 · 可 SQL 查报表)
 *
 * 永不阻塞主流程 · 失败静默。
 */
import { track as vercelTrack } from '@vercel/analytics';

const SESSION_KEY = 'al_sid';

/** 生成/获取匿名 session id · 存 localStorage · 一浏览器一辈子稳定 */
function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let sid = window.localStorage.getItem(SESSION_KEY);
    if (!sid) {
      // 简易 nanoid(避免额外 import)
      sid = Array.from(crypto.getRandomValues(new Uint8Array(9)))
        .map((b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36])
        .join('');
      window.localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

export function track(eventName: string, props: Record<string, string | number | boolean> = {}) {
  try {
    // 1. Vercel Analytics · 面板可视化
    vercelTrack(eventName, props);
  } catch {}

  // 2. 我方 DB · 永久归档
  try {
    const payload = {
      event: eventName,
      props,
      session_id: getSessionId(),
      path: typeof window !== 'undefined' ? window.location.pathname : null,
    };
    // fire-and-forget · beacon 优先(即便页面 unload 也发得出去)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/log', blob);
    } else {
      fetch('/api/analytics/log', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  } catch {}
}

/** hash 一段字符串(搜索关键词等敏感数据脱敏用 · 前 12 字符)*/
export function hashString(s: string): string {
  if (!s) return '';
  try {
    // 浏览器里没 crypto.createHash · 用 subtle 或简易 fallback
    // 这里给简易版:即便碰撞率高一点 · 也够做聚类
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return (h >>> 0).toString(36).padStart(8, '0').slice(0, 12);
  } catch {
    return '';
  }
}
