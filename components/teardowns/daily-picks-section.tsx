'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, ExternalLink, ChevronDown } from 'lucide-react';

const CATS = [
  { key: 'all',           label: '全部' },
  { key: 'ai-agent',      label: '🤖 AI Agent' },
  { key: 'coding',        label: '💻 开发工具' },
  { key: 'productivity',  label: '📊 效率生产力' },
  { key: 'creative',      label: '🎨 内容创作' },
  { key: 'saas',          label: '💰 SaaS' },
  { key: 'consumer',      label: '🎯 消费级' },
];

const CAT_BADGE_COLOR: Record<string, string> = {
  'ai-agent':      'bg-purple-600 text-white',
  'coding':        'bg-teal text-white',
  'productivity':  'bg-blue-600 text-white',
  'creative':      'bg-coral text-white',
  'saas':          'bg-green-600 text-white',
  'consumer':      'bg-gold text-ink',
};

const SAVED_KEY = 'ai-lens-saved-picks';

export function DailyPicksSection({ picks, activeCat: initialCat }: { picks: any[]; activeCat: string }) {
  const [activeCat, setActiveCat] = useState(initialCat);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
    } catch {}
  }, []);

  const toggleSave = (id: string) => {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
  };

  const filtered = activeCat === 'all' ? picks : picks.filter((p) => p.category === activeCat);
  const publishedPicks = filtered.filter((p) => !p.isDraft);
  const draftPicks = filtered.filter((p) => p.isDraft);

  return (
    <>
      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATS.map((c) => (
          <button
            key={c.key}
            onClick={() => { setActiveCat(c.key); setExpandedId(null); }}
            className={`px-3.5 py-1.5 border rounded-full text-sm font-semibold transition ${
              activeCat === c.key ? 'bg-ink text-background border-ink' : 'bg-cream border-line hover:border-ink'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 卡片网格 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-line rounded-xl">该分类下暂无精选</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5" style={{ gridAutoFlow: 'dense' }}>
          {[...publishedPicks, ...draftPicks].map((p) => {
            const isExpanded = expandedId === p.id;
            const isSaved = saved.includes(p.id);
            const isHot = (p.score || 0) >= 85;

            return (
              <article
                key={p.id}
                className={`bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm transition-all flex flex-col gap-2.5 ${
                  isExpanded ? 'md:col-span-2 lg:col-span-3' : 'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal cursor-pointer'
                }`}
                onClick={() => !isExpanded && setExpandedId(p.id)}
              >
                {/* head */}
                <div className="grid grid-cols-[48px_1fr_auto] gap-3 items-center">
                  <div
                    className="w-12 h-12 rounded-xl grid place-items-center text-xl text-white border-2 border-ink shadow-[2px_2px_0_#1a1a1a]"
                    style={{ background: p.logoColor || '#1a1a1a' }}
                  >
                    {p.logo || '🚀'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black tracking-tight truncate flex items-center gap-1.5">
                      {p.name}
                      {p.isDraft && <span className="bg-amber-100 text-amber-700 text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded">草稿</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono tracking-wide">来自 {p.source}</div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-sm font-black font-serif border-[1.5px] ${
                    isHot ? 'bg-coral text-white border-coral' : 'bg-bg-alt text-ink border-line'
                  }`}>{p.score || '—'}</div>
                </div>

                {/* tagline */}
                <p className={`text-sm text-ink-soft leading-relaxed ${!isExpanded && 'line-clamp-2'}`}>
                  {p.tagline}
                </p>

                {/* meta */}
                <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-line mt-auto">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                    CAT_BADGE_COLOR[p.category] || 'bg-bg-alt text-ink'
                  }`}>
                    {CATS.find((c) => c.key === p.category)?.label || p.category}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : p.id); }}
                    className="inline-flex items-center gap-1 px-3 py-1 border border-line rounded-full text-[11px] font-bold hover:bg-ink hover:text-background hover:border-ink transition"
                  >
                    {isExpanded ? '收起' : '展开 6 维'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* 展开区 · 6 维 */}
                {isExpanded && <ExpandedDetail p={p} isSaved={isSaved} onSave={() => toggleSave(p.id)} />}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function ExpandedDetail({ p, isSaved, onSave }: { p: any; isSaved: boolean; onSave: () => void }) {
  const dims = [
    { icon: '🎯', label: '定位',          content: p.positioning,       color: 'border-l-coral text-coral' },
    { icon: '💥', label: '痛点',          content: p.painPoint,         color: 'border-l-blue-600 text-blue-600' },
    { icon: '🔧', label: '产品解法',       content: p.solution,          color: 'border-l-teal text-teal' },
    { icon: '✨', label: '设计亮点',       content: p.designHighlight,   color: 'border-l-coral text-coral' },
    { icon: '🤖', label: 'Vibe Coding 灵感', content: p.vibeCoding,     color: 'border-l-purple-600 text-purple-600' },
    { icon: '💰', label: '商业价值',       content: p.commercial,        color: 'border-l-amber-700 text-amber-700' },
  ];
  const filledDims = dims.filter((d) => d.content && d.content.trim().length > 0);
  const anyContent = filledDims.length > 0 || p.consensus || p.criticism || p.editorTake;

  return (
    <div className="mt-4 pt-4 border-t-2 border-dashed border-line">
      {!anyContent && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-sm text-amber-800 mb-4">
          ⚠️ 这条是自动抓取的草稿。在 <Link href="/admin" className="underline font-bold">admin 后台</Link> 补充 6 维分析后会自动发布。
        </div>
      )}

      {/* 6 维 */}
      {filledDims.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
          {filledDims.map((d, i) => (
            <div key={i} className={`bg-white/50 border-l-[3px] rounded-r-lg p-3.5 grid grid-cols-[auto_1fr] gap-2.5 items-start ${d.color}`}>
              <div className="text-xl leading-none pt-0.5">{d.icon}</div>
              <div>
                <div className={`text-[10px] font-black tracking-widest uppercase mb-1 ${d.color.split(' ').filter((c) => c.startsWith('text-')).join(' ')}`}>{d.label}</div>
                <div className="text-sm leading-relaxed text-ink-soft">{d.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 用户声音 */}
      {(p.consensus || p.criticism) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {p.consensus && (
            <div className="bg-bg-alt rounded-xl p-4 border-l-[3px] border-green-500">
              <div className="text-[11px] font-black tracking-widest uppercase text-green-600 mb-1.5">✅ 用户共识</div>
              <p className="text-sm leading-relaxed text-ink-soft">{p.consensus}</p>
            </div>
          )}
          {p.criticism && (
            <div className="bg-bg-alt rounded-xl p-4 border-l-[3px] border-red-500">
              <div className="text-[11px] font-black tracking-widest uppercase text-red-600 mb-1.5">⚠️ 用户质疑</div>
              <p className="text-sm leading-relaxed text-ink-soft">{p.criticism}</p>
            </div>
          )}
        </div>
      )}

      {/* 编辑观点 */}
      {p.editorTake && (
        <div className="bg-ink text-background rounded-xl p-5 relative overflow-hidden mb-4">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.2),transparent_70%)] pointer-events-none" />
          <div className="text-[11px] font-black tracking-widest text-coral mb-1.5 relative">✍️ AI Lens 编辑观点</div>
          <p className="text-sm leading-relaxed text-white/85 relative">{p.editorTake}</p>
        </div>
      )}

      {/* 底部动作 */}
      <div className="flex justify-between items-center pt-3.5 border-t border-dashed border-line">
        <a
          href={p.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-coral text-white border-2 border-ink rounded-lg font-bold text-sm shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition"
        >
          <ExternalLink className="w-3.5 h-3.5" /> 访问官网
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
            isSaved ? 'bg-gold text-ink border-ink' : 'bg-transparent border-line hover:border-ink'
          }`}
        >
          {isSaved ? <><BookmarkCheck className="w-3.5 h-3.5" /> 已采集</> : <><Bookmark className="w-3.5 h-3.5" /> 采集灵感</>}
        </button>
      </div>
    </div>
  );
}
