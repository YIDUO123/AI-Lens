'use client';

/**
 * 更新日志红点 · 页脚"更新日志"链接旁
 * localStorage 记录上次看过哪版(latestId),有新版就亮红点;点进 changelog 页自动清
 */
import { useEffect, useState } from 'react';

const KEY = 'ailens-changelog-seen';

export function ChangelogDot({ latestId }: { latestId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== latestId);
    } catch {}
  }, [latestId]);

  return (
    <span
      aria-hidden="true"
      className={`inline-block w-1.5 h-1.5 rounded-full bg-coral transition-opacity ${show ? 'opacity-100 relative -top-1.5' : 'opacity-0'}`}
    />
  );
}

export function MarkChangelogSeen({ latestId }: { latestId: string }) {
  useEffect(() => {
    try { localStorage.setItem(KEY, latestId); } catch {}
  }, [latestId]);
  return null;
}
