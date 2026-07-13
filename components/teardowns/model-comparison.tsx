'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

const FAMILY_META: Record<string, { icon: string; name: string; color: string }> = {
  openai:    { icon: '🤖', name: 'OpenAI',    color: '#10a37f' },
  anthropic: { icon: '🧠', name: 'Anthropic', color: '#C15F3C' },
  google:    { icon: '🔷', name: 'Google',    color: '#4285F4' },
};

const TIER_LABEL: Record<string, { label: string; classes: string }> = {
  flagship: { label: 'FLAGSHIP', classes: 'bg-coral text-white' },
  pro:      { label: 'PRO',      classes: 'bg-amber-700 text-white' },
  mid:      { label: 'MID',      classes: 'bg-bg-alt text-ink' },
  small:    { label: 'SMALL',    classes: 'bg-teal text-white' },
  creative: { label: 'CREATIVE', classes: 'bg-purple-600 text-white' },
  legacy:   { label: 'LEGACY',   classes: 'bg-muted text-white' },
};

const DEFAULT_SELECTION = [
  'openai/gpt-5',
  'anthropic/claude-opus-4.8',
  'google/gemini-2.5-pro',
  'anthropic/claude-sonnet-4.5',
];

const MAX = 4;

export function ModelComparison({ models }: { models: any[] }) {
  // 主动权交给用户 · 不预选任何模型 · 首次进入引导用户选
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX) return cur;
      return [...cur, id];
    });
  };

  const byFamily: Record<string, any[]> = {};
  for (const m of models) {
    if (!byFamily[m.family]) byFamily[m.family] = [];
    byFamily[m.family].push(m);
  }

  const chosen = selected.map((id) => models.find((m) => m.id === id)).filter(Boolean);

  return (
    <>
      {/* 模型选择器 */}
      <div className="bg-cream border-2 border-ink rounded-2xl p-6 mb-5 shadow-brutal-sm">
        <div className="flex justify-between items-center pb-3 mb-3.5 border-b border-dashed border-line flex-wrap gap-2.5">
          <div className="flex items-center gap-3 text-[15px] font-black tracking-tight">
            <span>🎯 选择要对比的模型</span>
            <span className="text-xs text-muted-foreground font-medium">最多 4 个 · 已选 <b className="font-serif text-coral text-sm">{selected.length}</b>/4</span>
          </div>
          <button
            onClick={() => setSelected(DEFAULT_SELECTION.filter((id) => models.some((m) => m.id === id)))}
            className="px-3 py-1 border border-line rounded-full text-[11px] font-bold text-ink-soft hover:bg-ink hover:text-background hover:border-ink transition"
          >
            ↻ 重置默认
          </button>
        </div>

        <div className="space-y-2.5">
          {Object.entries(byFamily).map(([fam, list]) => {
            const meta = FAMILY_META[fam] || { icon: '📦', name: fam };
            return (
              <div key={fam} className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-3 items-center">
                <div className="text-[11px] font-black tracking-wide text-ink-soft flex items-center gap-1.5">
                  {meta.icon} {meta.name}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((m: any) => {
                    const active = selected.includes(m.id);
                    const disabled = !active && selected.length >= MAX;
                    const short = m.name.replace(/^(Anthropic|OpenAI|Google): /, '');
                    return (
                      <button
                        key={m.id}
                        onClick={() => !disabled && toggle(m.id)}
                        disabled={disabled}
                        className={`px-2.5 py-1 border-[1.5px] rounded-full text-xs font-semibold transition inline-flex items-center gap-1 ${
                          active
                            ? 'bg-ink text-white border-ink'
                            : disabled
                            ? 'bg-white border-line text-ink-soft opacity-40 cursor-not-allowed'
                            : 'bg-white border-line hover:border-ink'
                        }`}
                      >
                        {short}
                        {m.modelGroup === 'codex' && (
                          <span className={`text-[9px] px-1 py-0 rounded font-black tracking-widest ${
                            active ? 'bg-coral text-white' : 'bg-bg-alt text-muted-foreground'
                          }`}>CODEX</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 矩阵对比表 */}
      {chosen.length === 0 ? (
        <div className="bg-bg-alt border-2 border-dashed border-line rounded-2xl p-16 text-center">
          <h4 className="text-lg font-bold mb-2">👆 从上方选择要对比的模型</h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">最少 1 个,最多 4 个。选好后会自动生成 10 项维度的矩阵对比。</p>
        </div>
      ) : (
        <MatrixTable chosen={chosen} onRemove={toggle} />
      )}
    </>
  );
}

function MatrixTable({ chosen, onRemove }: { chosen: any[]; onRemove: (id: string) => void }) {
  const dims = [
    { key: 'positioning',    label: '定位',       type: 'text' },
    { key: 'released',       label: '发布日期',    type: 'text' },
    { key: 'contextLength',  label: '上下文长度', type: 'ctx' },
    { key: 'pricingIn',      label: '输入价格',    type: 'price' },
    { key: 'pricingOut',     label: '输出价格',    type: 'price' },
    { key: 'reasoning',      label: '推理能力',    type: 'star' },
    { key: 'coding',         label: '编码能力',    type: 'star' },
    { key: 'multimodal',     label: '多模态',      type: 'text' },
    { key: 'speed',          label: '响应速度',    type: 'text' },
    { key: 'highlight',      label: '特色亮点',    type: 'text' },
    { key: 'limits',         label: '能力边界',    type: 'text' },
  ];

  return (
    <div className="bg-cream border-2 border-ink rounded-2xl overflow-hidden shadow-brutal-sm mb-5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-3.5 text-left bg-bg-alt text-ink-soft text-[11px] font-black tracking-wide uppercase w-[130px] min-w-[130px]">对比维度</th>
              {chosen.map((m) => {
                const meta = FAMILY_META[m.family] || { icon: '📦', name: m.family, color: '#666' };
                const tier = TIER_LABEL[m.tier] || { label: m.tier, classes: 'bg-bg-alt text-ink' };
                const short = m.name.replace(/^(Anthropic|OpenAI|Google): /, '');
                return (
                  <th key={m.id} className="relative p-4 text-left align-top bg-ink text-background min-w-[200px] border-r border-white/10 last:border-r-0">
                    <button
                      onClick={() => onRemove(m.id)}
                      title="移出对比"
                      className="absolute top-2 right-2 w-6 h-6 bg-white/10 hover:bg-coral text-white/60 hover:text-white rounded-full grid place-items-center transition text-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase text-white mb-1" style={{ background: meta.color }}>
                      {meta.icon} {meta.name}
                    </div>
                    <div className="text-[15px] font-black tracking-tight mt-1 mb-0.5">{short}</div>
                    <div className="font-mono text-[10px] text-white/40 font-normal">{m.id}</div>
                    {m.tier !== 'flagship' && (
                      <span className={`inline-block mt-1.5 text-[9px] px-1.5 py-0 font-black rounded ${tier.classes}`}>{tier.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {dims.map((d) => (
              <tr key={d.key} className="hover:bg-orange-50/40 transition">
                <td className="p-3.5 text-[11px] font-black tracking-wide uppercase text-ink-soft bg-bg-alt border-r-2 border-ink align-middle">{d.label}</td>
                {chosen.map((m) => (
                  <td key={m.id} className="p-3.5 border-t border-dashed border-line border-r border-dashed last:border-r-0 align-top">
                    <Cell m={m} dim={d} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ m, dim }: { m: any; dim: any }) {
  const meta = m.meta || {};

  if (dim.type === 'ctx') {
    return (
      <>
        <span className="text-lg font-serif font-black text-coral">{fmtNumber(m.contextLength)}</span>
        <span className="text-[10px] text-muted-foreground ml-0.5">tokens</span>
      </>
    );
  }
  if (dim.type === 'price') {
    const v = m[dim.key];
    const high = v >= 5;
    return (
      <>
        <span className={`text-base font-serif font-bold ${high ? 'text-coral' : 'text-ink'}`}>{fmtPrice(v)}</span>
        <span className="text-[10px] text-muted-foreground ml-0.5">/1M</span>
      </>
    );
  }
  if (dim.type === 'star') {
    return <StarRating n={meta[dim.key]} />;
  }
  const text = meta[dim.key];
  if (!text) return <span className="text-muted-foreground">—</span>;
  return <span className="text-sm text-ink">{text}</span>;
}

function StarRating({ n }: { n: number | undefined }) {
  if (n == null) return <span className="text-muted-foreground">—</span>;
  const full = Math.floor(n);
  const half = n - full >= 0.5;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('★');
    else if (i === full && half) stars.push('⯨');
    else stars.push('☆');
  }
  return <span className="text-gold tracking-wider">{stars.join('')}</span>;
}

function fmtNumber(n: number): string {
  if (!n) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function fmtPrice(v: number): string {
  if (v == null) return '—';
  if (v === 0) return 'Free';
  if (v < 0.1) return '$' + v.toFixed(3);
  if (v < 1) return '$' + v.toFixed(2);
  return '$' + v.toFixed(2);
}
