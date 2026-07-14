'use client';

/**
 * /admin/teardowns 列表 · 带批量选中 + 一键删除
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Loader2, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { bulkDeleteTeardowns } from '@/lib/actions/teardowns';

const CAT_LABEL: Record<string, string> = {
  chat: '💬 对话', coding: '💻 编码', creative: '🎨 创作', enterprise: '🏢 企业', domestic: '🇨🇳 国产',
};

export function TeardownsListWithBulkDelete({ items }: { items: any[] }) {
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
    if (!confirm(`确认删除选中的 ${selected.size} 篇拆解?不可撤销。`)) return;
    startTransition(async () => {
      try {
        await bulkDeleteTeardowns(Array.from(selected));
        setSelected(new Set());
        router.refresh();
      } catch (e: any) { alert('删除失败:' + e.message); }
    });
  };

  return (
    <>
      {items.length > 0 && (
        <div className="sticky top-4 z-10 flex flex-wrap items-center gap-3 mb-4 bg-cream border-2 border-ink rounded-xl px-4 py-2.5 shadow-brutal-sm">
          <button type="button" onClick={toggleAll} className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
            {selected.size === items.length ? <CheckSquare className="w-4 h-4 text-coral" /> : <Square className="w-4 h-4" />}
            {selected.size === items.length ? '取消全选' : '全选'}
          </button>
          <span className="text-xs text-muted-foreground">
            已选 <b className="text-coral">{selected.size}</b> / {items.length}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={doBulk}
            disabled={selected.size === 0 || pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-600 transition"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            批量删除{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-line rounded-xl">
          还没有拆解 · 点右上"新建拆解"开始
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((t) => {
            const isChecked = selected.has(t.id);
            const bodyLen = (t.body || '').length;
            return (
              <div key={t.id} className={`relative pl-9 ${isChecked ? 'ring-2 ring-coral rounded-xl' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleOne(t.id)}
                  className="absolute top-1/2 -translate-y-1/2 left-1 z-20 w-6 h-6 rounded border-2 border-ink bg-white grid place-items-center hover:bg-bg-alt"
                >
                  {isChecked ? <CheckSquare className="w-4 h-4 text-coral" /> : null}
                </button>
                <Link
                  href={`/admin/teardowns/${t.id}`}
                  className="flex items-center gap-3 bg-cream border-2 border-ink rounded-xl p-4 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition"
                >
                  <div className="w-12 h-12 rounded-lg border-2 border-ink grid place-items-center flex-shrink-0 text-lg bg-white">🔬</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate mb-0.5">{t.title || '未命名'}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="font-mono uppercase">{CAT_LABEL[t.category] || t.category}</span>
                      <span>·</span>
                      <span>{bodyLen} 字</span>
                      {t.isDomestic && <><span>·</span><span className="text-red-600 font-bold">🇨🇳 国产</span></>}
                      <span>·</span>
                      <span>👁 {t.viewCount || 0}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
