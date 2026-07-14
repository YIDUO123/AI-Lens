'use client';

/**
 * /admin/picks 客户端列表包装 · 带批量选中 + 一键删除
 * 服务端从 DB 拿 picks · 交给这个组件渲染
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Loader2, CheckSquare, Square, Sparkles, ArrowRight } from 'lucide-react';
import { bulkDeletePicks } from '@/lib/actions/content';

type Pick = {
  id: string;
  name: string;
  source: string | null;
  logo: string | null;
  logoColor: string | null;
  positioning: string | null;
  painPoint: string | null;
  solution: string | null;
  designHighlight: string | null;
  vibeCoding: string | null;
  commercial: string | null;
  isDraft: boolean;
};

export function PicksListWithBulkActions({ picks, isDraftSection = false }: { picks: Pick[]; isDraftSection?: boolean }) {
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
    if (selected.size === picks.length) setSelected(new Set());
    else setSelected(new Set(picks.map((p) => p.id)));
  };

  const doBulkDelete = () => {
    if (selected.size === 0) return;
    if (!confirm(`确认删除选中的 ${selected.size} 条精选?此操作不可撤销。`)) return;
    startTransition(async () => {
      try {
        await bulkDeletePicks(Array.from(selected));
        setSelected(new Set());
        router.refresh();
      } catch (e: any) {
        alert('删除失败:' + e.message);
      }
    });
  };

  if (picks.length === 0) return null;

  return (
    <>
      {/* 批量操作条 */}
      <div className="sticky top-4 z-10 flex flex-wrap items-center gap-3 mb-4 bg-cream border-2 border-ink rounded-xl px-4 py-2.5 shadow-brutal-sm">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink"
        >
          {selected.size === picks.length ? <CheckSquare className="w-4 h-4 text-coral" /> : <Square className="w-4 h-4" />}
          {selected.size === picks.length ? '取消全选' : '全选'}
        </button>

        <span className="text-xs text-muted-foreground">
          已选 <b className="text-coral">{selected.size}</b> / {picks.length}
        </span>

        <div className="flex-1" />

        <button
          type="button"
          onClick={doBulkDelete}
          disabled={selected.size === 0 || pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-600 transition"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          批量删除{selected.size > 0 ? ` (${selected.size})` : ''}
        </button>
      </div>

      {/* 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {picks.map((p) => {
          const isChecked = selected.has(p.id);
          const filled = [p.positioning, p.painPoint, p.solution, p.designHighlight, p.vibeCoding, p.commercial].filter(Boolean).length;

          return (
            <div
              key={p.id}
              className={`relative bg-cream border-2 rounded-xl shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition ${
                isChecked ? 'border-coral ring-2 ring-coral/40' : 'border-ink'
              }`}
            >
              {/* 复选框 */}
              <button
                type="button"
                onClick={() => toggleOne(p.id)}
                className="absolute top-2 left-2 z-20 w-6 h-6 rounded border-2 border-ink bg-white grid place-items-center hover:bg-bg-alt"
                aria-label={isChecked ? '取消选中' : '选中'}
              >
                {isChecked ? <CheckSquare className="w-4 h-4 text-coral" /> : null}
              </button>

              {/* 卡片内容 · 点击进入编辑 */}
              <Link
                href={`/admin/picks/${p.id}`}
                className="flex items-center gap-3 p-4 pl-11"
              >
                <div className="w-10 h-10 rounded-lg grid place-items-center text-lg text-white flex-shrink-0" style={{ background: p.logoColor || '#1a1a1a' }}>
                  {p.logo || '🚀'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate flex items-center gap-1.5">
                    {p.name}
                    {isDraftSection && filled === 0 && <Sparkles className="w-3 h-3 text-amber-600" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{p.source}</span>
                    <span>·</span>
                    <span className={filled >= 6 ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                      {filled}/6 维已填
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
