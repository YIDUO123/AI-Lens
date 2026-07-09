'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import { Github, Mail, Loader2, ArrowRight } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'github' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGithub() {
    setLoading('github');
    setError(null);
    try {
      await signIn.social({ provider: 'github', callbackURL: next });
    } catch (e: any) {
      setError(e.message || '登录失败');
      setLoading(null);
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading('email');
    setError(null);
    const res = await signIn.email({ email, password, callbackURL: next });
    if (res.error) {
      setError(res.error.message || '登录失败');
      setLoading(null);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF6F0]">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(255,107,53,0.12),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(255,184,77,0.14),transparent_70%)]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* 品牌头 */}
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFB84D] border-2 border-black grid place-items-center text-white font-serif italic font-black text-lg shadow-[2px_2px_0_#1a1a1a] -rotate-6">
            L
          </div>
          <div>
            <div className="font-black text-lg tracking-tight">AI Lens</div>
            <div className="text-xs text-gray-500">尝试看清 AI 产品的实质</div>
          </div>
        </Link>

        {/* 登录卡 */}
        <div className="bg-white border-2 border-black rounded-2xl p-8 shadow-[6px_6px_0_#1a1a1a]">
          <div className="mb-6">
            <div className="text-xs font-black tracking-widest uppercase text-[#FF6B35] mb-1">Welcome back</div>
            <h1 className="text-3xl font-black tracking-tight">登录 <span className="font-serif italic text-[#FF6B35]">AI Lens</span></h1>
            <p className="text-sm text-gray-500 mt-2">用邮箱或 GitHub 一键登录,即可解锁收藏 · 评论 · 订阅</p>
          </div>

          {/* GitHub 登录 */}
          <button
            onClick={onGithub}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 py-3 border-2 border-black rounded-lg font-bold bg-black text-white hover:bg-gray-800 transition-all disabled:opacity-60"
          >
            {loading === 'github' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Github className="w-5 h-5" />}
            <span>用 GitHub 登录</span>
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            <span>或</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* 邮箱表单 */}
          <form onSubmit={onEmail} className="space-y-4">
            <div>
              <label className="text-xs font-bold tracking-wide text-gray-600 uppercase">邮箱</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="mt-1 w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-wide text-gray-600 uppercase">密码</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位"
                className="mt-1 w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black outline-none"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold bg-[#FF6B35] text-white border-2 border-black shadow-[2px_2px_0_#1a1a1a] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#1a1a1a] transition-all disabled:opacity-60"
            >
              {loading === 'email' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail className="w-5 h-5" /> 邮箱登录</>}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            没账号? <Link href="/sign-up" className="text-[#FF6B35] font-bold hover:underline">注册一个 →</Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          登录代表你同意 AI Lens 的 <Link href="/" className="underline hover:text-black">隐私政策</Link>
        </div>
      </div>
    </div>
  );
}
