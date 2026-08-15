'use client';

/**
 * 资讯反馈按钮 · 👍有用 / 👎没用
 * 乐观更新 · 再点取消 · 反馈用于校准每日推送。
 */
import { useState, useTransition } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { voteNews } from '@/lib/actions/news-feedback';

export function NewsFeedback({ newsId, initUp, initDown, initMyVote }: { newsId: string; initUp: number; initDown: number; initMyVote: number }) {
  const [up, setUp] = useState(initUp);
  const [down, setDown] = useState(initDown);
  const [my, setMy] = useState(initMyVote);
  const [pending, start] = useTransition();

  const vote = (v: 1 | -1) => {
    start(async () => {
      const r = await voteNews(newsId, v);
      if (r.ok) { setUp(r.up); setDown(r.down); setMy(r.myVote); }
    });
  };

  const base = 'inline-flex items-center gap-1.5 px-3 py-2 border-2 border-ink rounded-full text-sm font-bold transition disabled:opacity-60';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">这条对你有用吗?</span>
      <button onClick={() => vote(1)} disabled={pending}
        className={`${base} ${my === 1 ? 'bg-teal text-white' : 'bg-white hover:bg-bg-alt'}`}>
        <ThumbsUp className="w-4 h-4" /> {up > 0 && up}
      </button>
      <button onClick={() => vote(-1)} disabled={pending}
        className={`${base} ${my === -1 ? 'bg-ink text-white' : 'bg-white hover:bg-bg-alt'}`}>
        <ThumbsDown className="w-4 h-4" /> {down > 0 && down}
      </button>
    </div>
  );
}
