'use client';

/**
 * 洞察长文双栏编辑器
 * - 左栏:Markdown 编辑框 + 工具栏(加粗/标题/链接/图片/引用/列表/代码)
 * - 右栏:实时预览(用现成的 MarkdownContent 组件 · 和公开页一模一样)
 * - 顶栏:标题 · 分类 · 封面 · 摘要 · 阅读时长 · 精选开关
 * - 底栏:保存草稿 / 保存并发布 / 撤回 / 删除
 */
import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Save, Send, Trash2, Undo, Bold, Italic, Heading1, Heading2, Link as LinkIcon, Image as ImageIcon, Quote, List, ListOrdered, Code, Star, Eye, Edit3, Sparkles, Wand2, Upload } from 'lucide-react';
import { MarkdownContent } from '@/components/content/markdown-content';
import { updateInsight, publishInsight, unpublishInsight, deleteInsight, polishText, generateExcerptFromBody } from '@/lib/actions/insights';

const CATEGORIES = [
  { value: 'thinking',  label: '思考',    color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { value: 'hands-on',  label: '实操',    color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'method',    label: '方法',    color: 'text-teal-700 bg-teal-50 border-teal-200' },
  { value: 'industry',  label: '行业',    color: 'text-amber-700 bg-amber-50 border-amber-200' },
] as const;

type Article = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string | null;
  cover: string | null;
  body: string;
  readTime: number;
  featured: boolean;
  isDraft: boolean;
  sourceUrl: string | null;
  sourceName: string | null;
};

export function InsightEditor({ article }: { article: Article }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: article.title || '',
    category: article.category || 'thinking',
    excerpt: article.excerpt || '',
    cover: article.cover || '',
    body: article.body || '',
    readTime: article.readTime || 5,
    featured: article.featured || false,
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

  // 自动保存(3 秒不改就存一次)
  const [autoSaveTimer, setAutoSaveTimer] = useState<any>(null);
  useEffect(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const t = setTimeout(() => {
      updateInsight(article.id, form).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }).catch(() => {});
    }, 3000);
    setAutoSaveTimer(t);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [form]);

  const setField = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // ---------------- Markdown 工具栏:围绕光标插入 ----------------
  function wrap(before: string, after: string = before, placeholder = '') {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const sel = form.body.slice(s, e) || placeholder;
    const next = form.body.slice(0, s) + before + sel + after + form.body.slice(e);
    setField('body', next);
    // 光标移到 selected 结尾
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
    const before = form.body.slice(0, lineStart);
    const after = form.body.slice(s);
    const next = before + pre + sel + after;
    setField('body', next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = lineStart + pre.length + sel.length;
      el.setSelectionRange(pos, pos);
    });
  }

  // 在光标处/替换选区插入一段文字
  function insertAtCursor(text: string, replaceSelection = false) {
    const el = textareaRef.current;
    if (!el) { setField('body', form.body + '\n' + text); return; }
    const s = el.selectionStart;
    const e = replaceSelection ? el.selectionEnd : s;
    const next = form.body.slice(0, s) + text + form.body.slice(e);
    setField('body', next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + text.length;
      el.setSelectionRange(pos, pos);
    });
  }

  // ---------------- 图片上传 · 粘贴 / 拖拽 / 点按钮 ----------------
  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('只支持图片文件'); return; }
    setError(null);
    setUploading(true);
    const placeholder = `![上传中…](${file.name})`;
    insertAtCursor(placeholder);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const md = `![](${data.url})`;
      // 把 placeholder 换成真 URL
      setField('body', form.body.replace(placeholder, md).replace(placeholder, md));
      // 上面那句在闭包里可能拿到旧 form.body,兜底再直接 setForm
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

  // ---------------- AI 润色 · 选中文字 → 替换 ----------------
  function doPolish() {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    if (s === e) { setError('请先在正文里选中一段要润色的文字'); return; }
    const selected = form.body.slice(s, e);
    if (selected.length < 5) { setError('选中的文字太短(至少 5 字)'); return; }
    setError(null);
    startAI(async () => {
      try {
        const { polished } = await polishText(selected);
        const next = form.body.slice(0, s) + polished + form.body.slice(e);
        setField('body', next);
        setToast('✓ AI 润色完成');
        setTimeout(() => setToast(null), 2000);
      } catch (err: any) {
        setError('润色失败:' + err.message);
      }
    });
  }

  // ---------------- AI 生成摘要 ----------------
  function doGenerateExcerpt() {
    if (form.body.length < 50) { setError('正文太短 · 至少 50 字'); return; }
    setError(null);
    startAI(async () => {
      try {
        // 先把正文存进 DB · 再让 AI 读
        await updateInsight(article.id, { body: form.body });
        const { excerpt } = await generateExcerptFromBody(article.id);
        setField('excerpt', excerpt);
        setToast('✓ 摘要已生成');
        setTimeout(() => setToast(null), 2000);
      } catch (err: any) {
        setError('生成摘要失败:' + err.message);
      }
    });
  }

  const doSave = () => {
    setError(null);
    startSave(async () => {
      try {
        await updateInsight(article.id, form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const doPublish = () => {
    setError(null);
    if (!form.title.trim() || form.title === '未命名草稿') { setError('请先填标题'); return; }
    if (form.body.length < 20) { setError('正文太短(至少 20 字)'); return; }
    startSave(async () => {
      try {
        await updateInsight(article.id, form);
        await publishInsight(article.id);
        router.push('/admin/insights');
      } catch (e: any) { setError(e.message); }
    });
  };

  const doUnpublish = () => {
    if (!confirm('确认撤回到草稿?公开页会立即隐藏。')) return;
    startSave(async () => {
      try {
        await unpublishInsight(article.id);
        router.refresh();
      } catch (e: any) { setError(e.message); }
    });
  };

  const doDelete = () => {
    if (!confirm('确认永久删除这篇长文?不可撤销。')) return;
    startSave(async () => {
      try {
        await deleteInsight(article.id);
        router.push('/admin/insights');
      } catch (e: any) { setError(e.message); }
    });
  };

  return (
    <div className="space-y-4">
      {/* 顶部元数据 */}
      <div className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm space-y-3">
        <input
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="标题(必填 · 15-40 字最佳)"
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
            <input type="checkbox" checked={form.featured} onChange={(e) => setField('featured', e.target.checked)} className="w-4 h-4 accent-coral" />
            <Star className={`w-3.5 h-3.5 ${form.featured ? 'text-coral fill-coral' : 'text-muted-foreground'}`} />
            <span className="font-bold">精选</span>
          </label>

          <div className="flex items-center gap-1 text-xs">
            <input
              type="number"
              value={form.readTime}
              onChange={(e) => setField('readTime', Math.max(1, parseInt(e.target.value) || 5))}
              className="w-14 px-2 py-1 border border-line rounded text-center font-mono"
            />
            <span className="text-muted-foreground">分钟阅读</span>
          </div>
        </div>

        <div className="border-t border-dashed border-line pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">摘要 · Excerpt</label>
            <button
              type="button"
              onClick={doGenerateExcerpt}
              disabled={aiPending}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-coral hover:bg-coral/10 rounded border border-coral/30 hover:border-coral disabled:opacity-50"
            >
              {aiPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI 一键生成
            </button>
          </div>
          <textarea
            value={form.excerpt}
            onChange={(e) => setField('excerpt', e.target.value)}
            placeholder="首页/列表页展示 · 60-100 字 · 也可以让 AI 帮你写"
            rows={2}
            className="w-full px-0 py-1 bg-transparent border-0 focus:outline-none text-sm text-ink-soft italic resize-none"
          />
        </div>

        <input
          value={form.cover}
          onChange={(e) => setField('cover', e.target.value)}
          placeholder="封面图 URL(可选) · 建议 1200×630"
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
        <TbBtn onClick={doPolish} title="AI 润色选中段落 · 智谱免费">
          {aiPending ? <Loader2 className="w-4 h-4 animate-spin text-coral" /> : <Wand2 className="w-4 h-4 text-coral" />}
        </TbBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
            e.target.value = '';
          }}
        />

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 text-[11px] font-bold">
          <TabBtn active={tab === 'edit'} onClick={() => setTab('edit')}><Edit3 className="w-3 h-3" /> 编辑</TabBtn>
          <TabBtn active={tab === 'split'} onClick={() => setTab('split')}>分屏</TabBtn>
          <TabBtn active={tab === 'preview'} onClick={() => setTab('preview')}><Eye className="w-3 h-3" /> 预览</TabBtn>
        </div>
      </div>

      {/* 编辑区 · 预览区 */}
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
              placeholder="用 Markdown 写正文… · 图片直接粘贴/拖拽 · 选中一段点魔杖让 AI 润色"
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
            {form.body.trim() ? (
              <MarkdownContent>{form.body}</MarkdownContent>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-12">
                左侧写点什么 · 预览会在这里 👉
              </div>
            )}
          </div>
        )}
      </div>

      {/* 错误/成功提示 */}
      {error && <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 text-sm text-red-800">⚠️ {error}</div>}
      {toast && <div className="bg-green-50 border-2 border-green-500 rounded-xl p-3 text-sm text-green-800 flex items-center gap-2"><Sparkles className="w-4 h-4" /> {toast}</div>}

      {/* 底部操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 sticky bottom-4 z-10">
        <button
          onClick={doDelete}
          disabled={savePending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-red-300 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> 删除
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={doSave}
            disabled={savePending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-ink rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-bg-alt"
          >
            {savePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存草稿
          </button>
          {article.isDraft ? (
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

function TbBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-bg-alt text-ink-soft hover:text-ink transition"
    >
      {children}
    </button>
  );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded inline-flex items-center gap-1 transition ${
        active ? 'bg-ink text-background' : 'text-ink-soft hover:bg-bg-alt'
      }`}
    >
      {children}
    </button>
  );
}
