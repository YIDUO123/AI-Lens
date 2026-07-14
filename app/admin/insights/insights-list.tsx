'use client';

/**
 * /admin/insights 列表 · 带批量选中 + 一键删除
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Loader2, CheckSquare, Square, ArrowRight, AlertCircle, FileText } from 'lucide-react';
import { bulkDeleteInsights } from '@/lib/actions/insights';

const CAT_LABEL: Record<string, string> = {
  thinking: '🧭 思考', 'hands-on': '🛠️ 实操', method: '📐 方法', industry: '📊 行业',
};

export function InsightsListWithBulkDelete({ items, headerTitle, headerIcon }: {
  items: any[];
  headerTitle: string;
  headerIcon: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggleOne = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((x) => x.id)));
  };

  const doBulk = () => {
    if (selected.size === 0) return;
    if (!confirm(`确认删除选中的 ${selected.size} 篇长文?不可撤销。`)) return;
    startTransition(async () => {
      try {
        await bulkDeleteInsights(Array.from(selected));
        setSelected(new Set());
        router.refresh();
      } catch (e: any) { alert('删除失败:' + e.message); }
    });
  };

  return (
    <section className="mb-10">
      {/* 顶部 · 标题 + 计数 + 批量操作 */}
      <div className="flex items-center gap-2 mb-4">
        {headerIcon}
        <h2 className="text-lg font-black">{headerTitle}</h2>
        <span className="text-sm font-mono bg-bg-alt px-2 py-0.5 rounded border border-line">
          {items.length}
        </span>

        <div className="flex-1" />

        {items.length > 0 && (
          <>
            <button type="button" onClick={toggleAll} className="inline-flex items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink">
              {selected.size === items.length ? <CheckSquare className="w-3.5 h-3.5 text-coral" /> : <Square className="w-3.5 h-3.5" />}
              {selected.size === items.length ? '全消' : '全选'}
            </button>
            <button
              type="button"
              onClick={doBulk}
              disabled={selected.size === 0 || pending}
              className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-600 transition"
            >
              {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              删 {selected.size > 0 ? selected.size : ''}
            </button>
          </>
        )}
      </div>

      {/* 列表 */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-line rounded-xl">
          还没有内容
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const isChecked = selected.has(a.id);
            const bodyLen = (a.body || '').length;
            const isExternal = !!a.sourceUrl;
            return (
              <div key={a.id} className={`relative pl-9 ${isChecked ? 'ring-2 ring-coral rounded-xl' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleOne(a.id)}
                  className="absolute top-1/2 -translate-y-1/2 left-1 z-20 w-6 h-6 rounded border-2 border-ink bg-white grid place-items-center hover:bg-bg-alt"
                >
                  {isChecked ? <CheckSquare className="w-4 h-4 text-coral" /> : null}
                </button>
                <Link
                  href={`/admin/insights/${a.id}`}
                  className="flex items-center gap-3 bg-cream border-2 border-ink rounded-xl p-4 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition"
                >
                  <div className="w-12 h-12 rounded-lg border-2 border-ink grid place-items-center flex-shrink-0 text-lg"
                       style={{ background: isExternal ? '#eff6ff' : '#fff' }}>
                    {isExternal ? '🔗' : '✍️'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate mb-0.5">{a.title || '未命名'}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="font-mono uppercase">{CAT_LABEL[a.category] || a.category}</span>
                      <span>·</span>
                      <span>{bodyLen} 字</span>
                      {isExternal && <><span>·</span><span className="text-blue-600">🔗 外部来源</span></>}
                      {a.featured && <><span>·</span><span className="text-coral font-bold">⭐ 精选</span></>}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
