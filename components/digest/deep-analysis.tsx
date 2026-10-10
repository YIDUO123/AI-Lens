'use client';

/**
 * AI 深度解析 · 按需展开的长文解析
 * - 收起时只渲染一个按钮;点击后调 server action
 * - 缓存命中秒回;首次生成 20-40s,给阶段提示
 * - 生成一次全站共享(落 news_cards.deep_analysis)
 */
import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { loadDeepAnalysis } from '@/lib/actions/news-card-action';
import { MarkdownContent } from '@/components/content/markdown-content';

const LOADING_HINTS = [
  '正在读取事件背景…',
  '正在分析竞争格局…',
  '正在提炼 PM 视角…',
  'AI 正在写作,大约 20-40 秒…',
];

/**
 * @param variant block = 卡片详情页的整行 CTA;button = 时间线里的紧凑操作按钮(点击后原地展开)
 */
export function DeepAnalysis({ newsId, autoOpen = false, variant = 'block' }: { newsId: string; autoOpen?: boolean; variant?: 'block' | 'button' }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>(autoOpen ? 'loading' : 'idle');
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [hint, setHint] = useState(0);

  const run = async () => {
    if (state === 'loading') return;
    setState('loading');
    setError('');
    const hintTimer = setInterval(() => setHint((h) => (h + 1) % LOADING_HINTS.length), 4000);
    try {
      const r = await loadDeepAnalysis(newsId);
      if (r.ok) { setMarkdown(r.markdown); setState('ready'); }
      else { setError(r.error); setState('failed'); }
    } catch {
      setError('网络异常,请重试');
      setState('failed');
    } finally {
      clearInterval(hintTimer);
    }
  };

  // button 形态:激活后撑满所在 flex-wrap 行(w-full/basis-full);block 形态:独立块,上方留白
  const panelCls = (s: 'ready' | 'loading' | 'failed') =>
    variant === 'button'
      ? `basis-full w-full rounded-2xl border-2 border-ink bg-white overflow-hidden ${s === 'failed' ? 'border-dashed border-line' : ''}`
      : `mt-6 rounded-2xl border-2 border-ink bg-white overflow-hidden ${s === 'failed' ? 'border-dashed border-line !bg-white px-5 py-4' : ''}`;

  if (state === 'ready' && markdown) {
    return (
      <section className={panelCls('ready')}>
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-coral to-gold text-white">
          <span className="flex items-center gap-2 text-sm font-black tracking-wide">
            <Sparkles className="w-4 h-4" />
            AI 深度解析
          </span>
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">AI Lens · 5-8 min read</span>
        </div>
        <div className="px-5 py-4 md:px-7 md:py-6">
          <MarkdownContent>{markdown}</MarkdownContent>
          <p className="mt-6 pt-4 border-t border-dashed border-line text-xs text-muted-foreground">
            深度解析由 AI 基于标题与摘要推断生成 · 观点仅供参考,事实以原文为准
          </p>
        </div>
      </section>
    );
  }

  if (state === 'loading') {
    return (
      <section className={panelCls('loading')}>
        <div className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-coral to-gold text-white">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-black tracking-wide">AI 深度解析生成中</span>
        </div>
        <div className="px-5 py-6">
          <div className="flex items-center gap-2 text-sm font-bold text-coral mb-4">
            {LOADING_HINTS[hint]}
          </div>
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3.5 rounded bg-bg-alt animate-pulse" style={{ width: `${100 - i * 9}%` }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (state === 'failed') {
    return (
      <section className={panelCls('failed')}>
        <div className="flex items-center gap-2 text-sm font-bold text-ink-soft mb-2.5">
          <AlertCircle className="w-4 h-4 text-coral" />
          深度解析生成失败:{error}
        </div>
        <button
          type="button"
          onClick={run}
          className="press inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-background rounded-lg text-sm font-bold hover:bg-coral transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重试
        </button>
      </section>
    );
  }

  // idle · 收起态按钮
  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={run}
        className="press inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-coral to-gold text-white rounded-md text-[11px] font-black shadow-[2px_2px_0_rgba(26,26,26,0.25)] hover:shadow-brutal-sm hover:-translate-y-px transition-all"
      >
        <Sparkles className="w-3 h-3" />
        AI 解析
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      className="press group mt-4 w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 border-ink bg-gradient-to-r from-orange-50 to-amber-100/70 hover:shadow-brutal transition-all text-left"
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-coral to-gold border-2 border-ink grid place-items-center text-white">
          <Sparkles className="w-4 h-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-ink leading-tight">AI 深度解析</span>
          <span className="block text-[11px] text-muted-foreground leading-tight mt-0.5">
            长文版 · 事件全景 / 深层解读 / 竞争影响 / PM 启示
          </span>
        </span>
      </span>
      <span className="flex-shrink-0 flex items-center gap-1 text-xs font-black text-coral">
        生成
        <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
      </span>
    </button>
  );
}
