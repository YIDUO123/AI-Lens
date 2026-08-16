'use client';

/**
 * 卡片正文 · 客户端异步加载(卡片未缓存时用)
 * 页面首屏秒出,六维在这里生成中 → 完成后填入,不让用户干等 AI。
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadNewsCard } from '@/lib/actions/news-card-action';
import { NewsDims } from '@/components/digest/news-dims';
import type { NewsCardDims } from '@/db';

export function CardBody({ newsId, fallbackSummary }: { newsId: string; fallbackSummary?: string | null }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [card, setCard] = useState<{ tldr: string; dims: NewsCardDims } | null>(null);

  useEffect(() => {
    let alive = true;
    loadNewsCard(newsId)
      .then((c) => { if (!alive) return; if (c) { setCard(c); setState('ready'); } else setState('failed'); })
      .catch(() => alive && setState('failed'));
    return () => { alive = false; };
  }, [newsId]);

  if (state === 'ready' && card) return <NewsDims tldr={card.tldr} dims={card.dims} />;

  if (state === 'failed') {
    return <p className="text-sm text-muted-foreground mt-4">{fallbackSummary || '六维拆解暂时生成失败,请刷新重试。'}</p>;
  }

  // loading 骨架
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 text-sm text-coral font-bold mb-4">
        <Loader2 className="w-4 h-4 animate-spin" /> 正在生成六维拆解…
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-2 border-ink/20 rounded-xl p-4 bg-white/60 animate-pulse">
            <div className="h-3 w-20 bg-ink/10 rounded mb-3" />
            <div className="h-3 w-full bg-ink/10 rounded mb-1.5" />
            <div className="h-3 w-4/5 bg-ink/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
