'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Save, Send, Trash2, Undo } from 'lucide-react';
import { updateDailyPick, aiGenerateForPick, publishPick, unpublishPick, deletePick } from '@/lib/actions/content';

const DIMS = [
  { key: 'positioning',      icon: '🎯', label: '定位' },
  { key: 'painPoint',        icon: '💥', label: '痛点' },
  { key: 'solution',         icon: '🔧', label: '产品解法' },
  { key: 'designHighlight',  icon: '✨', label: '设计亮点' },
  { key: 'vibeCoding',       icon: '🤖', label: 'Vibe Coding 灵感' },
  { key: 'commercial',       icon: '💰', label: '商业价值' },
] as const;

const VOICES = [
  { key: 'consensus',   icon: '✅', label: '用户共识' },
  { key: 'criticism',   icon: '⚠️', label: '用户质疑' },
  { key: 'editorTake',  icon: '✍️', label: 'AI Lens 编辑观点' },
] as const;

export function PickEditor({ pick }: { pick: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    positioning:     pick.positioning || '',
    painPoint:       pick.painPoint || '',
    solution:        pick.solution || '',
    designHighlight: pick.designHighlight || '',
    vibeCoding:      pick.vibeCoding || '',
    commercial:      pick.commercial || '',
    consensus:       pick.consensus || '',
    criticism:       pick.criticism || '',
    editorTake:      pick.editorTake || '',
  });
  const [saved, setSaved] = useState(false);
  const [aiPending, startAI] = useTransition();
  const [savePending, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const setField = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const doAI = () => {
    setError(null);
    if (!confirm('用 Gemini AI 生成完整 6 维分析?会覆盖当前所有字段。')) return;
    startAI(async () => {
      try {
        const res = await aiGenerateForPick(pick.id);
        setForm({
          positioning: res.analysis.positioning,
          painPoint: res.analysis.painPoint,
          solution: res.analysis.solution,
          designHighlight: res.analysis.designHighlight,
          vibeCoding: res.analysis.vibeCoding,
          commercial: res.analysis.commercial,
          consensus: res.analysis.consensus,
          criticism: res.analysis.criticism,
          editorTake: res.analysis.editorTake,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const doSave = () => {
    setError(null);
    startSave(async () => {
      try {
        await updateDailyPick(pick.id, form);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const doPublish = () => {
    startSave(async () => {
      try {
        await updateDailyPick(pick.id, form);
        await publishPick(pick.id);
        router.push('/admin/picks');
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const doUnpublish = () => {
    if (!confirm('确认下架这条精选?')) return;
    startSave(async () => {
      try {
        await unpublishPick(pick.id);
        router.push('/admin/picks');
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const doDelete = () => {
    if (!confirm('确认永久删除?这个操作不可撤销。')) return;
    startSave(async () => {
      try {
        await deletePick(pick.id);
        router.push('/admin/picks');
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* AI 一键兜底 */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-ink rounded-2xl p-5 shadow-brutal-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-coral" />
          <h3 className="font-black text-sm">AI 兜底 · 一键生成 6 维</h3>
        </div>
        <p className="text-xs text-ink-soft mb-3">
          Gemini Flash 会根据产品名 · tagline · 官网,自动生成 6 维分析 + 用户声音 + 编辑观点。生成后你可以再手工微调。
        </p>
        <button
          onClick={doAI}
          disabled={aiPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-background rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-ink/90"
        >
          {aiPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {aiPending ? '生成中(15 秒左右)…' : '让 AI 兜底填写'}
        </button>
      </div>

      {error && <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 text-sm text-red-800">⚠️ {error}</div>}
      {saved && <div className="bg-green-50 border-2 border-green-500 rounded-xl p-3 text-sm text-green-800">✅ 已保存</div>}

      {/* 6 维 */}
      <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm">
        <h3 className="font-black mb-4">6 维分析</h3>
        <div className="space-y-4">
          {DIMS.map((d) => (
            <div key={d.key}>
              <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground block mb-1">
                {d.icon} {d.label}
              </label>
              <textarea
                value={form[d.key as keyof typeof form]}
                onChange={(e) => setField(d.key, e.target.value)}
                rows={3}
                placeholder={`写一段 40-100 字的 ${d.label}…`}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 用户声音 + 编辑观点 */}
      <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm">
        <h3 className="font-black mb-4">用户声音 + 编辑观点</h3>
        <div className="space-y-4">
          {VOICES.map((v) => (
            <div key={v.key}>
              <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground block mb-1">
                {v.icon} {v.label}
              </label>
              <textarea
                value={form[v.key as keyof typeof form]}
                onChange={(e) => setField(v.key, e.target.value)}
                rows={3}
                placeholder={`写一段 ${v.label}…`}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={doDelete}
          disabled={savePending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-red-300 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> 删除
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={doSave}
            disabled={savePending}
            className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-ink rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-bg-alt"
          >
            {savePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
          {pick.isDraft ? (
            <button
              onClick={doPublish}
              disabled={savePending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> 保存并发布
            </button>
          ) : (
            <button
              onClick={doUnpublish}
              disabled={savePending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-100 text-amber-800 border-2 border-amber-500 rounded-lg text-sm font-bold hover:bg-amber-200 disabled:opacity-50"
            >
              <Undo className="w-4 h-4" /> 撤回到草稿
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
