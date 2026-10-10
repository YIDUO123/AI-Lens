'use client';

/**
 * 已读标记 · 时间线卡片
 * - 挂载时读 localStorage(ailens-read-v1);已读 → 整卡淡化
 * - 未读卡在视口停留 2.5s → 记为已读
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
    const el = ref.current?.closest('article');

    if (read.has(newsId)) {
      setIsRead(true);
      if (el) (el as HTMLElement).dataset.read = '1';
      return;
    }

    // 视口内停留 2.5s → 标已读
    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) {
        timer = setTimeout(() => {
          const s = loadReadSet();
          s.add(newsId);
          persistReadSet(s);
          setIsRead(true);
          if (el) (el as HTMLElement).dataset.read = '1';
          io.disconnect();
        }, 2500);
      } else if (!e.isIntersecting && timer) {
        clearTimeout(timer);
        timer = null;
      }
    }, { threshold: 0.5 });
    if (el) io.observe(el);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
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
      }}
      className="press inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-coral transition-colors"
      title="清除已读记录"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      清除已读({count})
    </button>
  );
}
