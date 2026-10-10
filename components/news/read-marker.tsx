'use client';

/**
 * 已读标记 · 时间线卡片
 * - 点击卡片(任意链接:标题/六维/原文/AI 解析)才记为已读
 * - 已读卡整体淡化;localStorage 持久化(ailens-read-v1)
 * - 配套 ClearReadButton 放在时间线尾部
 */
import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

const KEY = 'ailens-read-v1';

function loadReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistReadSet(set: Set<string>) {
  try {
    // 上限保护:只留最近 500 条
    const arr = [...set].slice(-500);
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {}
}

export function ReadMarker({ newsId }: { newsId: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    const read = loadReadSet();
    const el = ref.current?.closest('article') as HTMLElement | null;

    if (read.has(newsId)) {
      setIsRead(true);
      return;
    }

    // 点击卡片内任意元素(链接/按钮)→ 记已读
    const onClick = () => {
      const s = loadReadSet();
      if (s.has(newsId)) return;
      s.add(newsId);
      persistReadSet(s);
      setIsRead(true);
    };
    el?.addEventListener('click', onClick, { capture: true });
    return () => el?.removeEventListener('click', onClick, { capture: true } as EventListenerOptions);
  }, [newsId]);

  // 已读 → 卡片淡化为次级观感(保留可读性)
  useEffect(() => {
    const el = ref.current?.closest('article') as HTMLElement | null;
    if (!el) return;
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = isRead ? '0.62' : '1';
  }, [isRead]);

  return <span ref={ref} aria-hidden="true" className="hidden" />;
}

export function ClearReadButton() {
  const [count, setCount] = useState(0);

  useEffect(() => { setCount(loadReadSet().size); }, []);

  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={() => {
        try { localStorage.removeItem(KEY); } catch {}
        setCount(0);
        document.querySelectorAll('article[data-read]').forEach((el) => {
          (el as HTMLElement).style.opacity = '1';
          delete (el as HTMLElement).dataset.read;
        });
        window.location.reload();
      }}
      className="press inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-coral transition-colors"
      title="清除已读记录"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      清除已读({count})
    </button>
  );
}
