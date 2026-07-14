'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Link2, Sparkles, CheckCircle } from 'lucide-react';
import { fetchOgMetadata, saveExternalRef } from '@/lib/actions/content';

type OgData = {
  title: string;
  description: string;
  image: string;
  siteName: string;
  author: string;
  body: string;
};

export function CollectForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [og, setOg] = useState<OgData | null>(null);
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<'thinking' | 'hands-on' | 'method' | 'industry'>('thinking');
  const [readTime, setReadTime] = useState(5);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const doFetch = () => {
    setError(null);
    setSavedSlug(null);
    if (!url) return;
    startTransition(async () => {
      try {
        const result = await fetchOgMetadata(url);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const data = result.data;
        setOg(data);
        // 抓到的正文自动填入下方 body 输入框 · 作为你补评注的底稿
        if (data.body) {
          setBody(
            `> 来源: [${data.siteName}](${url})${data.author ? ' · ' + data.author : ''}\n\n` +
            `${data.body}\n\n` +
            `---\n\n` +
            `## ✍️ AI Lens 编辑视角\n\n(在这里补充你的 PM 观点 · 为什么值得看 · 有哪些启发)\n`
          );
        }
      } catch (e: any) {
        // 兜底 · 理论上 fetchOgMetadata 不再抛错 · 但如果网络挂/RSC 挂也接住
        setError('抓取失败:' + (e?.message || '未知错误 · 请稍后再试'));
      }
    });
  };

  const doSave = (isDraft: boolean) => {
    if (!og) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveExternalRef({
          title: og.title,
          excerpt: og.description,
          body: body || `> 来自 ${og.siteName}${og.author ? ' · ' + og.author : ''}\n\n${og.description}\n\n---\n\n**AI Lens 编辑视角**:\n\n(待补充)`,
          category,
          sourceUrl: url,
          sourceName: og.siteName,
          sourceAuthor: og.author,
          sourceImage: og.image,
          readTime,
          isDraft,
        });
        setSavedSlug(res.slug);
        // 保存后清空
        if (!isDraft) {
          setTimeout(() => router.push(`/insights/${res.slug}`), 800);
        }
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Step 1 · URL 输入 */}
      <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm">
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Step 1</div>
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4" />
          <h3 className="font-black">粘贴原文链接</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mp.weixin.qq.com/… 或 https://xiaohongshu.com/…"
            className="flex-1 px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink"
          />
          <button
            onClick={doFetch}
            disabled={pending || !url}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-background rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-ink/90"
          >
            {pending && !og ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            抓取
          </button>
        </div>
        {error && <div className="mt-2 text-sm text-red-600">⚠️ {error}</div>}
      </div>

      {/* Step 2 · 预览 + 编辑 */}
      {og && (
        <>
          <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm">
            <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-3">Step 2 · 抓到的元数据</div>
            <div className="flex gap-4">
              {og.image && (
                <img src={og.image} alt="" className="w-32 h-32 rounded-lg object-cover border-2 border-ink flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">标题</label>
                  <input
                    value={og.title}
                    onChange={(e) => setOg({ ...og, title: e.target.value })}
                    className="w-full px-2 py-1 border border-line rounded text-sm font-bold focus:outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">摘要</label>
                  <textarea
                    value={og.description}
                    onChange={(e) => setOg({ ...og, description: e.target.value })}
                    rows={2}
                    className="w-full px-2 py-1 border border-line rounded text-xs focus:outline-none focus:border-ink resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">出处</label>
                    <input
                      value={og.siteName}
                      onChange={(e) => setOg({ ...og, siteName: e.target.value })}
                      className="w-full px-2 py-1 border border-line rounded text-xs focus:outline-none focus:border-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">作者</label>
                    <input
                      value={og.author}
                      onChange={(e) => setOg({ ...og, author: e.target.value })}
                      className="w-full px-2 py-1 border border-line rounded text-xs focus:outline-none focus:border-ink"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm">
            <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-3">Step 3 · 你的评注</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="从 PM 视角写一段你的编辑观点(留空的话会用默认模板占位)…&#10;&#10;支持 markdown 语法(标题、粗体、列表、引用等)"
              className="w-full px-3 py-2 border border-line rounded-lg text-sm font-mono focus:outline-none focus:border-ink resize-y"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground block mb-1">分类</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink"
                >
                  <option value="thinking">🧭 行业思考</option>
                  <option value="hands-on">🛠️ 上手体验</option>
                  <option value="method">📐 方法论</option>
                  <option value="industry">📊 行业观察</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground block mb-1">阅读时长(分钟)</label>
                <input
                  type="number"
                  value={readTime}
                  onChange={(e) => setReadTime(parseInt(e.target.value) || 5)}
                  min={1} max={60}
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => doSave(true)}
              disabled={pending}
              className="px-4 py-2 border-2 border-ink rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-bg-alt"
            >
              💾 保存草稿
            </button>
            <button
              onClick={() => doSave(false)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition disabled:opacity-50"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              发布到洞察专栏
            </button>
          </div>

          {savedSlug && (
            <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 text-sm text-green-900">
              ✅ 已保存 · slug: <code className="bg-white px-1 py-0.5 rounded">{savedSlug}</code> · 3 秒后跳转
            </div>
          )}
        </>
      )}
    </div>
  );
}
