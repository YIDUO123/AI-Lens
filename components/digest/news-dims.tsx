/**
 * 资讯六维 · 展示组件(纯展示,server/client 通用)
 * 被卡片页(server,卡片已缓存时)和 CardBody(client,现场生成时)复用。
 */
import type { NewsCardDims } from '@/db';
import { ReadAloud } from '@/components/digest/read-aloud';

const DIM_META: { key: keyof NewsCardDims; label: string; icon: string }[] = [
  { key: 'coreFact',    label: '核心事实', icon: '🎯' },
  { key: 'keyData',     label: '关键数据', icon: '📊' },
  { key: 'whyMatters',  label: '为什么重要', icon: '💡' },
  { key: 'whoAffected', label: '谁受影响', icon: '👥' },
  { key: 'context',     label: '背景脉络', icon: '🧩' },
  { key: 'pmInsight',   label: 'PM 视角 · 行动启示', icon: '🧭' },
];

export function NewsDims({ tldr, dims }: { tldr: string; dims: NewsCardDims }) {
  const readText = [
    tldr,
    `核心事实。${dims.coreFact}`,
    `关键数据。${dims.keyData}`,
    `为什么重要。${dims.whyMatters}`,
    `谁受影响。${dims.whoAffected}`,
    `背景脉络。${dims.context}`,
    `PM 视角。${dims.pmInsight}`,
  ].filter(Boolean).join(' ');

  return (
    <>
      {tldr && (
        <div className="bg-gold/20 border-l-4 border-gold rounded-r-lg px-4 py-3 mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black tracking-widest uppercase text-amber-700 mb-1">TL;DR · 一句话核心</div>
            <p className="text-lg font-bold leading-snug">{tldr}</p>
          </div>
          <ReadAloud text={readText} />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 mt-4">
        {DIM_META.map((d) => (
          <div
            key={d.key}
            className={`border-2 border-ink rounded-xl p-4 bg-white ${d.key === 'pmInsight' ? 'md:col-span-2 bg-coral/5 border-coral' : ''}`}
          >
            <div className="text-[11px] font-black tracking-widest uppercase text-ink-soft mb-1.5">{d.icon} {d.label}</div>
            <p className="text-sm leading-relaxed text-ink">{dims[d.key] || '暂无'}</p>
          </div>
        ))}
      </div>
    </>
  );
}
