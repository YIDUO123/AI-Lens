'use client';

/**
 * 拆解编辑器 · 复用 insight-editor 90% 结构
 * 差异:5 种 category · 加 productUrl · isDomestic 切换 · 加 positioning 一句话定位
 */
import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Send, Trash2, Bold, Italic, Heading1, Heading2, Link as LinkIcon, Image as ImageIcon, Quote, List, ListOrdered, Code, Eye, Edit3, Sparkles, Wand2, Upload, MapPin } from 'lucide-react';
import { MarkdownContent } from '@/components/content/markdown-content';
import { updateTeardown, publishTeardown, deleteTeardown, polishTeardownText } from '@/lib/actions/teardowns';

const CATEGORIES = [
  { value: 'chat',       label: '💬 对话',   color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'coding',     label: '💻 编码',   color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { value: 'creative',   label: '🎨 创作',   color: 'text-pink-700 bg-pink-50 border-pink-200' },
  { value: 'enterprise', label: '🏢 企业',   color: 'text-teal-700 bg-teal-50 border-teal-200' },
  { value: 'domestic',   label: '🇨🇳 国产',  color: 'text-red-700 bg-red-50 border-red-200' },
] as const;

type Teardown = {
  id: string;
  slug: string;
  title: string;
  category: string;
  positioning: string | null;
  cover: string | null;
  body: string;
  productUrl: string | null;
  readTime: number;
  isDomestic: boolean;
};

export function TeardownEditor({ teardown, isDraft }: { teardown: Teardown; isDraft: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: teardown.title || '',
    category: teardown.category || 'chat',
    positioning: teardown.positioning || '',
    cover: teardown.cover || '',
    body: teardown.body || '',
    productUrl: teardown.productUrl || '',
    readTime: teardown.readTime || 8,
    isDomestic: teardown.isDomestic || false,
  });
  const [tab, setTab] = useState<'edit' | 'preview' | 'split'>('split');
  const [saved, setSaved] = useState(false);
  const [savePending, startSave] = useTransition();
  const [aiPending, startAI] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<any>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(form));
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    const current = JSON.stringify(form);
    if (current === lastSavedRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      updateTeardown(teardown.id, form)
        .then(() => {
          lastSavedRef.current = current;
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        })
        .catch(() => {});
    }, 3000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [form, teardown.id]);

  const setField = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  function wrap(before: string, after: string = before, placeholder = '') {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const sel = form.body.slice(s, e) || placeholder;
    const next = form.body.slice(0, s) + before + sel + after + form.body.slice(e);
    setField('body', next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + before.length + sel.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function prefix(pre: string, placeholder = '') {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = form.body.lastIndexOf('\n', s - 1) + 1;
    const sel = form.body.slice(lineStart, s) || placeholder;
    const next = form.body.slice(0, lineStart) + pre + sel + form.body.slice(s);
    setField('body', next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = lineStart + pre.length + sel.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) { setField('body', form.body + '\n' + text); return; }
    const s = el.selectionStart;
    const next = form.body.slice(0, s) + text + form.body.slice(s);
    setField('body', next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + text.length, s + text.length);
    });
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('只支持图片文件'); return; }
    setError(null);
    setUploading(true);
    const placeholder = `![上传中…${Date.now()}](${file.name})`;
    insertAtCursor(placeholder);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const md = `![](${data.url})`;
      setForm((f) => ({ ...f, body: f.body.replace(placeholder, md) }));
      setToast('✓ 图片已上传');
      setTimeout(() => setToast(null), 2000);
    } catch (err: any) {
      setForm((f) => ({ ...f, body: f.body.replace(placeholder, '') }));
      setError('上传失败:' + err.message);
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        e.preventDefault();
        const f = it.getAsFile();
        if (f) uploadFile(f);
        return;
      }
    }
  }

  function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    e.preventDefault();
    imgs.forEach(uploadFile);
  }

  function doPolish() {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    if (s === e) { setError('请先选中一段文字'); return; }
    const selected = form.body.slice(s, e);
    if (selected.length < 5) { setError('选中的文字太短'); return; }
    setError(null);
    startAI(async () => {
      try {
        const { polished } = await polishTeardownText(selected);
        const next = form.body.slice(0, s) + polished + form.body.slice(e);
        setField('body', next);
        setToast('✓ AI 润色完成');
        setTimeout(() => setToast(null), 2000);
      } catch (err: any) {
        setError('润色失败:' + err.message);
      }
    });
  }

  const doSave = () => {
    setError(null);
    startSave(async () => {
      try {
        await updateTeardown(teardown.id, form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (err: any) { setError(err.message); }
    });
  };

  const doPublish = () => {
    setError(null);
    if (!form.title.trim() || form.title === '未命名拆解') { setError('请先填标题'); return; }
    if (form.body.length < 50) { setError('正文太短(至少 50 字)'); return; }
    startSave(async () => {
      try {
        await publishTeardown(teardown.id, form);
        router.push('/admin/teardowns');
      } catch (err: any) { setError(err.message); }
    });
  };

  const doDelete = () => {
    if (!confirm('确认永久删除这篇拆解?不可撤销。')) return;
    startSave(async () => {
      try {
        await deleteTeardown(teardown.id);
        router.push('/admin/teardowns');
      } catch (err: any) { setError(err.message); }
    });
  };

  return (
    <div className="space-y-4">
      {/* 顶部元数据 */}
      <div className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm space-y-3">
        <input
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="拆解标题(必填 · 建议 15-40 字)"
          className="w-full text-3xl md:text-4xl font-black tracking-tight bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground/40"
        />

        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setField('category', c.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest border transition ${
                form.category === c.value ? c.color : 'text-muted-foreground border-line hover:bg-bg-alt'
              }`}
            >
              {c.label}
            </button>
          ))}

          <div className="flex-1" />

          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={form.isDomestic} onChange={(e) => setField('isDomestic', e.target.checked)} className="w-4 h-4 accent-coral" />
            <MapPin className={`w-3.5 h-3.5 ${form.isDomestic ? 'text-red-600' : 'text-muted-foreground'}`} />
            <span className="font-bold">🇨🇳 国产</span>
          </label>

          <div className="flex items-center gap-1 text-xs">
            <input
              type="number"
              value={form.readTime}
              onChange={(e) => setField('readTime', Math.max(1, parseInt(e.target.value) || 8))}
              className="w-14 px-2 py-1 border border-line rounded text-center font-mono"
            />
            <span className="text-muted-foreground">分钟</span>
          </div>
        </div>

        <textarea
          value={form.positioning}
          onChange={(e) => setField('positioning', e.target.value)}
          placeholder="一句话定位 · 15-40 字 · 首页/列表页展示"
          rows={2}
          className="w-full px-0 py-1 bg-transparent border-0 border-t border-dashed border-line focus:outline-none focus:border-solid focus:border-ink text-sm text-ink-soft italic resize-none"
        />

        <input
          value={form.productUrl}
          onChange={(e) => setField('productUrl', e.target.value)}
          placeholder="产品官网 URL(可选)"
          className="w-full px-0 py-1 bg-transparent border-0 border-t border-dashed border-line focus:outline-none focus:border-solid focus:border-ink text-xs font-mono text-muted-foreground"
        />

        <input
          value={form.cover}
          onChange={(e) => setField('cover', e.target.value)}
          placeholder="封面图 URL(可选)· 建议 1200×630"
          className="w-full px-0 py-1 bg-transparent border-0 border-t border-dashed border-line focus:outline-none focus:border-solid focus:border-ink text-xs font-mono text-muted-foreground"
        />
      </div>

      {/* 工具栏 + Tab */}
      <div className="flex items-center gap-1 flex-wrap bg-cream border-2 border-ink rounded-xl px-2 py-1.5 shadow-brutal-sm">
        <TbBtn onClick={() => prefix('# ', '标题')} title="H1"><Heading1 className="w-4 h-4" /></TbBtn>
        <TbBtn onClick={() => prefix('## ', '小标题')} title="H2"><Heading2 className="w-4 h-4" /></TbBtn>
        <TbBtn onClick={() => wrap('**', '**', '加粗')} title="加粗"><Bold className="w-4 h-4" /></TbBtn>
        <TbBtn onClick={() => wrap('*', '*', '斜体')} title="斜体"><Italic className="w-4 h-4" /></TbBtn>
        <div className="w-px h-5 bg-line mx-1" />
        <TbBtn onClick={() => wrap('[', '](https://)', '链接文字')} title="链接"><LinkIcon className="w-4 h-4" /></TbBtn>
        <TbBtn onClick={() => wrap('![', '](https://)', '图片描述')} title="图片"><ImageIcon className="w-4 h-4" /></TbBtn>
        <TbBtn onClick={() => prefix('> ', '引用')} title="引用"><Quote className="w-4 h-4" /></TbBtn>
        <TbBtn onClick={() => prefix('- ', '列表项')} title="无序列表"><List className="w-4 h-4" /></TbBtn>
        <TbBtn onClick={() => prefix('1. ', '列表项')} title="有序列表"><ListOrdered className="w-4 h-4" /></TbBtn>
        <TbBtn onClick={() => wrap('`', '`', '代码')} title="行内代码"><Code className="w-4 h-4" /></TbBtn>
        <div className="w-px h-5 bg-line mx-1" />
        <TbBtn onClick={() => fileInputRef.current?.click()} title="上传图片">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-coral" /> : <Upload className="w-4 h-4" />}
        </TbBtn>
        <TbBtn onClick={doPolish} title="AI 润色">
          {aiPending ? <Loader2 className="w-4 h-4 animate-spin text-coral" /> : <Wand2 className="w-4 h-4 text-coral" />}
        </TbBtn>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />

        <div className="flex-1" />
        <div className="flex items-center gap-0.5 text-[11px] font-bold">
          <TabBtn active={tab === 'edit'} onClick={() => setTab('edit')}><Edit3 className="w-3 h-3" /> 编辑</TabBtn>
          <TabBtn active={tab === 'split'} onClick={() => setTab('split')}>分屏</TabBtn>
          <TabBtn active={tab === 'preview'} onClick={() => setTab('preview')}><Eye className="w-3 h-3" /> 预览</TabBtn>
        </div>
      </div>

      {/* 编辑 + 预览 */}
      <div className={`grid gap-4 ${tab === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {(tab === 'edit' || tab === 'split') && (
          <div className="bg-cream border-2 border-ink rounded-2xl shadow-brutal-sm overflow-hidden">
            <textarea
              ref={textareaRef}
              value={form.body}
              onChange={(e) => setField('body', e.target.value)}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              placeholder="用 Markdown 写正文 · Ctrl+V 粘贴图片 · 选中一段点 🪄 让 AI 润色"
              className="w-full min-h-[500px] p-5 font-mono text-[13px] leading-[1.7] bg-transparent border-0 focus:outline-none resize-y"
            />
            <div className="px-5 py-2 border-t border-dashed border-line flex items-center justify-between text-[11px] text-muted-foreground bg-bg-alt/50">
              <span className="font-mono">{form.body.length} 字符 · {form.body.split('\n').length} 行</span>
              <span>{savePending ? '保存中…' : saved ? '✓ 已保存' : '3 秒无操作自动保存'}</span>
            </div>
          </div>
        )}
        {(tab === 'preview' || tab === 'split') && (
          <div className="bg-white border-2 border-ink rounded-2xl shadow-brutal-sm p-6 min-h-[500px] overflow-y-auto">
            {form.body.trim() ? <MarkdownContent>{form.body}</MarkdownContent> : (
              <div className="text-center text-muted-foreground text-sm py-12">左侧写点什么 · 预览会在这里 👉</div>
            )}
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 text-sm text-red-800">⚠️ {error}</div>}
      {toast && <div className="bg-green-50 border-2 border-green-500 rounded-xl p-3 text-sm text-green-800 flex items-center gap-2"><Sparkles className="w-4 h-4" /> {toast}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button onClick={doDelete} disabled={savePending} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-red-300 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" /> 删除
        </button>
        <div className="flex items-center gap-2">
          <button onClick={doSave} disabled={savePending} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-ink rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-bg-alt">
            {savePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存
          </button>
          <button onClick={doPublish} disabled={savePending} className="inline-flex items-center gap-1.5 px-4 py-2 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition disabled:opacity-50">
            <Send className="w-4 h-4" /> {isDraft ? '保存并发布' : '保存并更新'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TbBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button type="button" onClick={onClick} title={title} className="p-1.5 rounded hover:bg-bg-alt text-ink-soft hover:text-ink transition">
      {children}
    </button>
  );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`px-2.5 py-1 rounded inline-flex items-center gap-1 transition ${active ? 'bg-ink text-background' : 'text-ink-soft hover:bg-bg-alt'}`}>
      {children}
    </button>
  );
}
