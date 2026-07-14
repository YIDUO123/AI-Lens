'use client';

/**
 * 时间线快速添加表单 · 一屏搞定
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { addTimelineVersion } from '@/lib/actions/timeline';

const FAMILIES = [
  { value: 'openai',    label: '🤖 OpenAI' },
  { value: 'anthropic', label: '🧠 Anthropic' },
  { value: 'google',    label: '🔷 Google' },
  { value: 'cursor',    label: '⚡ Cursor' },
  { value: 'domestic',  label: '🇨🇳 国内' },
];

export function TimelineForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    family: 'openai',
    version: '',
    title: '',
    dateLabel: '',
    dateOrderDate: new Date().toISOString().slice(0, 10),
    breakthrough: false,
    changesRaw: '',   // 一行一条 · 提交时 split
    capability: '',
    signal: '',
  });

  const setField = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // 自动从日期推 dateLabel
  const autoDateLabel = () => {
    if (form.dateLabel) return;
    const d = new Date(form.dateOrderDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setField('dateLabel', `${y}.${m}`);
  };

  const submit = () => {
    setError(null);
    if (!form.version.trim()) { setError('version 必填'); return; }
    if (!form.title.trim()) { setError('title 必填'); return; }
    if (!form.dateLabel.trim()) { setError('dateLabel 必填(如 2026.07)'); return; }
    if (!form.dateOrderDate) { setError('dateOrderDate 必填'); return; }
    const changes = form.changesRaw.split('\n').map((s) => s.trim()).filter(Boolean);
    if (changes.length === 0) { setError('至少 1 条变化点'); return; }

    startTransition(async () => {
      try {
        await addTimelineVersion({
          family: form.family,
          version: form.version,
          title: form.title,
          dateLabel: form.dateLabel,
          dateOrderDate: form.dateOrderDate,
          breakthrough: form.breakthrough,
          changes,
          capability: form.capability,
          signal: form.signal,
        });
        setToast('✓ 已添加');
        setTimeout(() => setToast(null), 2000);
        setForm({
          ...form, version: '', title: '', changesRaw: '', capability: '', signal: '',
          dateOrderDate: new Date().toISOString().slice(0, 10), dateLabel: '', breakthrough: false,
        });
        router.refresh();
      } catch (err: any) { setError(err.message); }
    });
  };

  return (
    <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm space-y-4">
      <h3 className="font-black">➕ 新增版本</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 家族 */}
        <div>
          <label className="block text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">家族</label>
          <select value={form.family} onChange={(e) => setField('family', e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink">
            {FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* 版本号 */}
        <div>
          <label className="block text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">版本号</label>
          <input value={form.version} onChange={(e) => setField('version', e.target.value)} placeholder="GPT-5.6" className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink" />
        </div>

        {/* 日期 */}
        <div>
          <label className="block text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">发布日期</label>
          <input type="date" value={form.dateOrderDate} onChange={(e) => setField('dateOrderDate', e.target.value)} onBlur={autoDateLabel} className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink font-mono" />
        </div>
      </div>

      {/* 标题(主 title) */}
      <div>
        <label className="block text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">标题</label>
        <input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="GPT-5.6 · 新增视觉推理能力" className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 日期标签 */}
        <div>
          <label className="block text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">日期标签(展示用)</label>
          <input value={form.dateLabel} onChange={(e) => setField('dateLabel', e.target.value)} placeholder="2026.07" className="w-full px-3 py-2 border border-line rounded-lg text-sm font-mono focus:outline-none focus:border-ink" />
        </div>

        {/* 突破性 */}
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border-2 border-line hover:border-ink transition">
            <input type="checkbox" checked={form.breakthrough} onChange={(e) => setField('breakthrough', e.target.checked)} className="w-4 h-4 accent-coral" />
            <Sparkles className={`w-4 h-4 ${form.breakthrough ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <span className="text-sm font-bold">⭐ 突破性版本</span>
          </label>
        </div>
      </div>

      {/* 变化点 */}
      <div>
        <label className="block text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">变化点(一行一条 · 3-5 条最佳)</label>
        <textarea value={form.changesRaw} onChange={(e) => setField('changesRaw', e.target.value)} rows={4}
          placeholder={`视觉推理能力大幅提升\n上下文窗口扩到 500k tokens\n价格降 30%\n新增 Function Calling v2`}
          className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink resize-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 能力 */}
        <div>
          <label className="block text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">关键能力(可选 · 1 句)</label>
          <input value={form.capability} onChange={(e) => setField('capability', e.target.value)} placeholder="首次在多模态推理上超越 Gemini" className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink" />
        </div>

        {/* 信号 */}
        <div>
          <label className="block text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">行业信号(可选 · 1 句)</label>
          <input value={form.signal} onChange={(e) => setField('signal', e.target.value)} placeholder="OpenAI 重新拿回性能榜首" className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink" />
        </div>
      </div>

      {error && <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 text-sm text-red-800">⚠️ {error}</div>}
      {toast && <div className="bg-green-50 border-2 border-green-500 rounded-xl p-3 text-sm text-green-800">{toast}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-coral text-white border-2 border-ink rounded-lg text-sm font-black shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        添加到时间线
      </button>
    </div>
  );
}
