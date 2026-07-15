'use client';

/**
 * ViewBeacon v2 · 阅读侧完整埋点
 *
 * 触发 3 类事件:
 *   1. viewCount 自增(server action · 业务表)
 *   2. content_view(user_events · 客户端 track · 带 slug/type/session)
 *   3. content_scroll_end(用户滚到 95% 时 · 带停留时长)
 *
 * 都是 fire-and-forget · 失败静默 · 不影响阅读体验
 */
import { useEffect, useRef } from 'react';
import { incrementView } from '@/lib/actions/interactions';
import { track } from '@/lib/analytics/track-client';

export function ViewBeacon({
  targetType,
  targetId,
  slug,
  category,
}: {
  targetType: 'article' | 'teardown';
  targetId: string;
  slug?: string;
  category?: string;
}) {
  const startTimeRef = useRef<number>(Date.now());
  const scrollEndFiredRef = useRef<boolean>(false);

  useEffect(() => {
    startTimeRef.current = Date.now();

    // ① 业务表阅读量自增
    incrementView(targetType, targetId).catch(() => {});

    // ② content_view 事件
    track('content_view', {
      type: targetType,
      slug: slug || '',
      category: category || '',
    });

    // ③ 滚动到 95% 触发 content_scroll_end(只触发一次)
    const onScroll = () => {
      if (scrollEndFiredRef.current) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = scrollTop / docHeight;
      if (pct >= 0.95) {
        scrollEndFiredRef.current = true;
        const readingTimeSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        track('content_scroll_end', {
          type: targetType,
          slug: slug || '',
          reading_time_sec: readingTimeSec,
        });
      }
    };

    // 用 passive · 减少滚动性能影响
    window.addEventListener('scroll', onScroll, { passive: true });
    // 20 秒后 · 如果用户还在页面但没滚到底 · 记录一次"离开时点"
    // 这里不做 · 简单起见

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [targetType, targetId, slug, category]);

  return null;
}
