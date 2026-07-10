'use client';

/**
 * Newsletter 订阅表单
 * - 内联窄版:塞进首页/文章底部/关于页
 * - 邮箱输入 + 订阅按钮 + 成功/失败提示
 */
import { useState } from 'react';
import { Mail, Loader2, Check } from 'lucide-react';

export function NewsletterForm({ source = 'unknown', compact = false }: { source?: string; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMsg('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '订阅失败');
      setStatus('ok');
      setMsg(data.message || '订阅成功 ✓');
      setEmail('');
    } catch (err: any) {
      setStatus('err');
      setMsg(err.message);
    }
  };

  if (compact) {
    return (
      <form onSubmit={submit} className="flex gap-2 max-w-sm">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 px-3 py-2 border-2 border-ink rounded-lg text-sm focus:outline-none bg-cream"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-y-0.5 transition disabled:opacity-50"
        >
          {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : status === 'ok' ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          订阅
        </button>
        {msg && <div className={`text-xs mt-1 ${status === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg}</div>}
      </form>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-ink rounded-2xl p-6 md:p-8 shadow-brutal-sm">
      <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-2">Weekly Newsletter</div>
      <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
        每周日晚 · <em className="accent">AI Lens 周报</em>
      </h3>
      <p className="text-sm text-ink-soft mb-5 leading-relaxed">
        每周日 8 点(北京时间)· 一封信 · 给你本周最值得看的 AI 洞察 · 产品拆解 · 精选工具 · 不打广告 · 一键退订。
      </p>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 px-4 py-3 border-2 border-ink rounded-lg text-sm focus:outline-none bg-white"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition disabled:opacity-50 whitespace-nowrap"
        >
          {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> :
           status === 'ok' ? <Check className="w-4 h-4" /> :
           <Mail className="w-4 h-4" />}
          {status === 'ok' ? '已订阅' : '订阅周报'}
        </button>
      </form>

      {msg && (
        <div className={`mt-3 text-sm font-bold ${status === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
          {status === 'ok' ? '✓' : '⚠️'} {msg}
        </div>
      )}
    </div>
  );
}
