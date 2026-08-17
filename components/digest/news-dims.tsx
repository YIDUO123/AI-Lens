/**
 * 资讯六维 · 展示组件(纯展示,server/client 通用)
 * 结构:文章概览(一段话)+ STAR(情境/焦点/行动/结果)+ 行动启示
 * 被卡片页(server,卡片已缓存时)和 CardBody(client,现场生成时)复用。
 */
import type { NewsCardDims } from '@/db';
import { ReadAloud } from '@/components/digest/read-aloud';

const STAR: { key: keyof NewsCardDims; letter: string; label: string }[] = [
  { key: 'situation', letter: 'S', label: '情境 · 背景' },
  { key: 'task',      letter: 'T', label: '焦点 · 要解决什么' },
  { key: 'action',    letter: 'A', label: '行动 · 关键做法' },
  { key: 'result',    letter: 'R', label: '结果 · 影响' },
];

export function NewsDims({ tldr, dims }: { tldr: string; dims: NewsCardDims }) {
  const readText = [
    dims.overview || tldr,
    `情境。${dims.situation}`,
    `焦点。${dims.task}`,
    `行动。${dims.action}`,
    `结果。${dims.result}`,
    `行动启示。${dims.takeaway}`,
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* 文章概览 · 一段话 */}
      {(dims.overview || tldr) && (
        <div className="bg-gold/15 border-l-4 border-gold rounded-r-lg px-4 py-4 mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black tracking-widest uppercase text-amber-700 mb-1.5">文章概览</div>
            <p className="text-[15px] leading-relaxed text-ink">{dims.overview || tldr}</p>
          </div>
          <div className="flex-none"><ReadAloud text={readText} /></div>
        </div>
      )}

      {/* STAR · 四项 */}
      <div className="mb-2 text-[10px] font-black tracking-widest uppercase text-ink-soft">STAR · 结构化拆解</div>
      <div className="grid gap-3 md:grid-cols-2">
        {STAR.map((s) => (
          <div key={s.key} className="border-2 border-ink rounded-xl p-4 bg-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-ink text-white text-xs font-black flex-none">{s.letter}</span>
              <span className="text-[11px] font-black tracking-widest uppercase text-ink-soft">{s.label}</span>
            </div>
            <p className="text-sm leading-relaxed text-ink">{dims[s.key] || '暂无'}</p>
          </div>
        ))}
      </div>

      {/* 行动启示 · 高亮 */}
      <div className="mt-3 border-2 border-coral rounded-xl p-4 bg-coral/5">
        <div className="text-[11px] font-black tracking-widest uppercase text-coral mb-1.5">🧭 行动启示</div>
        <p className="text-sm leading-relaxed text-ink">{dims.takeaway || '暂无'}</p>
      </div>
    </>
  );
}
