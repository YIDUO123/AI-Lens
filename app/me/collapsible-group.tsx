'use client';

/**
 * /me 页里可折叠的交互分组
 * 默认只显示第 1 条 · 点"展开"看剩余
 *
 * ⚠️ Server → Client 不能传函数 · 所以 items 用**预渲染的 JSX 数组**接
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function CollapsibleGroup({
  title,
  count,
  renderedItems,
}: {
  title: string;
  count: number;
  renderedItems: React.ReactNode[]; // 服务端已渲染的 JSX 数组
}) {
  const [expanded, setExpanded] = useState(false);
  const list = renderedItems || [];

  const visible = expanded ? list : list.slice(0, 1);
  const hidden = Math.max(0, list.length - 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-black tracking-widest uppercase text-ink-soft">{title} · {count}</h3>
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-coral hover:underline"
          >
            {expanded ? (
              <>收起 <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>展开 {hidden} 条 <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((el, i) => <div key={i}>{el}</div>)}
      </div>
    </div>
  );
}
