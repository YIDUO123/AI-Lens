'use client';

/**
 * 首页右侧动态镜头 · 循环滚动最新新闻 + 打字终端
 * 复刻 1.0 的"仿浏览器 lens"动画
 */
import { useEffect, useState, useMemo } from 'react';

const CAT_STYLES: Record<string, { label: string; color: string }> = {
  'ai-models':   { label: 'MODEL',    color: '#FF6B35' },
  'ai-products': { label: 'PRODUCT',  color: '#0E5C5A' },
  'industry':    { label: 'INDUSTRY', color: '#2F6FEB' },
  'paper':       { label: 'PAPER',    color: '#B8860B' },
  'tip':         { label: 'TIP',      color: '#5C2E7E' },
};

const TYPING_LINES = [
  'fetch --source=all --filter=signal',
  'filter noise > 90% removed ✓',
  'analyze trends across 5 model families',
  'summarize · categorize · surface',
  'publishing 200+ signals daily',
];

export function LiveNewsFeed({ items: initial }: { items: any[] }) {
  const items = useMemo(() => (initial.length > 0 ? initial : SAMPLE), [initial]);
  const [visible, setVisible] = useState<number[]>(() => items.slice(0, 4).map((_, i) => i));
  const [count, setCount] = useState(0);
  const [terminalText, setTerminalText] = useState('');

  // 数字跳动:0 → 真实计数
  useEffect(() => {
    const target = 217;
    let cur = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(t); }
      setCount(cur);
    }, 30);
    return () => clearInterval(t);
  }, []);

  // 新闻滚动
  useEffect(() => {
    if (items.length < 5) return;
    let cursor = 4;
    const t = setInterval(() => {
      setVisible((cur) => {
        const next = [cursor % items.length, ...cur.slice(0, 3)];
        cursor++;
        return next;
      });
    }, 2600);
    return () => clearInterval(t);
  }, [items.length]);

  // 打字动画
  useEffect(() => {
    let li = 0, ci = 0, deleting = false, cancelled = false;
    function tick() {
      if (cancelled) return;
      const cur = TYPING_LINES[li];
      if (!deleting) {
        ci++;
        setTerminalText(cur.slice(0, ci));
        if (ci === cur.length) { deleting = true; setTimeout(tick, 1400); return; }
      } else {
        ci--;
        setTerminalText(cur.slice(0, ci));
        if (ci === 0) { deleting = false; li = (li + 1) % TYPING_LINES.length; }
      }
      setTimeout(tick, deleting ? 25 : 50);
    }
    tick();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative aspect-square">
      <div className="relative h-full flex flex-col gap-3 bg-gradient-to-br from-[#FFF8EE] via-[#FFEED8] to-[#FFDDB4] border-2 border-ink rounded-3xl shadow-brutal-lg p-6 overflow-hidden">
        {/* 光晕 */}
        <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.35),transparent_70%)] pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between pb-3 border-b-2 border-dashed border-ink/15">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="h-2 w-2 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-1.5 bg-cream border border-ink/10 rounded-full px-3 py-1 font-mono text-[11px] text-ink-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-dot" />
            ai-lens / today
          </div>
        </div>

        {/* Counter + bar */}
        <div className="relative flex items-center gap-2 pb-1.5">
          <span className="bg-ink text-background text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded">TRACKING</span>
          <span className="font-serif text-2xl font-black text-coral leading-none tracking-tight min-w-[44px]">{count}</span>
          <span className="text-[11px] font-mono text-muted-foreground flex-1">signals today</span>
        </div>
        <div className="relative h-0.5 bg-ink/8 rounded overflow-hidden">
          <div className="h-full bg-gradient-to-r from-coral to-gold origin-left animate-[pulse-bar_3.6s_ease-in-out_infinite]" />
        </div>

        {/* Rolling feed */}
        <div className="relative flex-1 flex flex-col gap-2 pt-2 overflow-hidden">
          {visible.map((idx, position) => {
            const item = items[idx];
            if (!item) return null;
            const catStyle = CAT_STYLES[item.category || ''] || { label: 'NEWS', color: '#666' };
            const isHot = position === 0;
            return (
              <div
                key={`${idx}-${position}`}
                className={`animate-[rollin_0.6s_cubic-bezier(0.2,0.8,0.2,1)_both] rounded-lg border p-2.5 transition ${
                  isHot ? 'border-coral bg-gradient-to-r from-orange-100/50 to-white/70' : 'border-ink/10 bg-white/70'
                }`}
              >
                <span className="mr-2 font-mono text-[10px] font-black text-coral">{fmtTime(item.publishedAt)}</span>
                <span className="mr-2 inline-block text-[9px] font-black tracking-widest text-white px-1.5 py-0 rounded" style={{ background: catStyle.color }}>
                  {catStyle.label}
                </span>
                <span className="text-xs text-ink">{(item.title || '').slice(0, 50)}</span>
              </div>
            );
          })}
        </div>

        {/* Terminal */}
        <div className="relative flex items-center gap-1.5 bg-ink text-green-300 rounded-lg px-3 py-2 font-mono text-[11px] min-h-[30px]">
          <span className="text-coral font-black">$</span>
          <span className="text-white/90">{terminalText}</span>
          <span className="inline-block w-1.5 h-3 bg-green-300 animate-[blink_1s_step-end_infinite] align-middle" />
        </div>
      </div>

      {/* Badge */}
      <div className="absolute -bottom-3 left-8 bg-ink text-background font-serif font-black text-[13px] px-4 py-2.5 rounded-full border-2 border-ink tracking-wide">
        🔍 <span className="text-coral">Real-time</span> lens
      </div>

      {/* 内联 keyframes */}
      <style jsx global>{`
        @keyframes rollin {
          from { opacity: 0; transform: translateY(-14px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes pulse-bar {
          0%, 100% { transform: scaleX(0.05); }
          50%      { transform: scaleX(1); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function fmtTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  const diffH = Math.round((Date.now() - d.getTime()) / 3600000);
  if (diffH < 1) return '刚刚';
  if (diffH < 24) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const SAMPLE = [
  { title: 'Anthropic Claude Opus 4.8 · 编码 SOTA 再刷新', category: 'ai-models', publishedAt: new Date() },
  { title: 'Cursor 2.0 上线后台代理,可 24 小时长任务', category: 'ai-products', publishedAt: new Date() },
  { title: 'MIT 论文:多模态推理边界的可解释性', category: 'paper', publishedAt: new Date() },
  { title: '为什么 AI PM 应该比工程师更懂 AI?', category: 'tip', publishedAt: new Date() },
];
