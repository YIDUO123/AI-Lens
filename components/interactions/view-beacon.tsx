'use client';

/**
 * 阅读量埋点 · 客户端 mount 时打一次 · 不阻塞渲染 · 失败也不影响体验
 */
import { useEffect } from 'react';
import { incrementView } from '@/lib/actions/interactions';

export function ViewBeacon({ targetType, targetId }: { targetType: 'article' | 'teardown'; targetId: string }) {
  useEffect(() => {
    // fire-and-forget · 不 await · 不显示 loading
    incrementView(targetType, targetId).catch(() => {});
    // 只在挂载时打一次 · id 变化才重打
  }, [targetType, targetId]);

  return null;
}
