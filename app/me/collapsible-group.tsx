'use client';

/**
 * /me 页里可折叠的交互分组
 * 每组默认只展示第 1 条 · 剩余折叠 · 点"展开 N 条"看全
 * 即便组里只有 1 条 · 也支持整组折叠(用户想要精简界面)
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
  renderedItems: React.ReactNode[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [collapsedAll, setCollapsedAll] = useState(false);
  const list = renderedItems || [];

  // 完全折叠 · 只显示 header · 点又打开
  // 未折叠时:显示第 1 条 · 隐藏其余(如果有多条)· 或全部显示(如果只有 1 条)
  const visible = collapsedAll ? [] : expanded ? list : list.slice(0, 1);
  const hidden = Math.max(0, list.length - 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <button
          type="button"
          onClick={() => setCollapsedAll((c) => !c)}
          className="text-xs font-black tracking-widest uppercase text-ink-soft hover:text-ink inline-flex items-center gap-1.5"
        >
          {collapsedAll ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          {title} · {count}
        </button>

        {!collapsedAll && hidden > 0 && (
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

      {!collapsedAll && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map((el, i) => <div key={i}>{el}</div>)}
        </div>
      )}
    </div>
  );
}
