'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth-client';
import { Loader2, ArrowRight } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signUp.email({ email, password, name, callbackURL: '/' });
    if (res.error) {
      setError(res.error.message || '注册失败');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF6F0]">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFB84D] border-2 border-black grid place-items-center text-white font-serif italic font-black text-lg shadow-[2px_2px_0_#1a1a1a] -rotate-6">
            L
          </div>
          <div>
            <div className="font-black text-lg tracking-tight">AI Lens</div>
            <div className="text-xs text-gray-500">尝试看清 AI 产品的实质</div>
          </div>
        </Link>

        <div className="bg-white border-2 border-black rounded-2xl p-8 shadow-[6px_6px_0_#1a1a1a]">
          <div className="mb-6">
            <div className="text-xs font-black tracking-widest uppercase text-[#FF6B35] mb-1">New here</div>
            <h1 className="text-3xl font-black tracking-tight">创建 <span className="font-serif italic text-[#FF6B35]">账号</span></h1>
            <p className="text-sm text-gray-500 mt-2">和我一起看懂 AI 产业的每一步。</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold tracking-wide text-gray-600 uppercase">昵称</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="你叫什么"
                className="mt-1 w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-wide text-gray-600 uppercase">邮箱</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                className="mt-1 w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-wide text-gray-600 uppercase">密码</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位"
                className="mt-1 w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black outline-none" />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold bg-[#FF6B35] text-white border-2 border-black shadow-[2px_2px_0_#1a1a1a] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#1a1a1a] transition-all disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>创建账号 <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            已有账号? <Link href="/sign-in" className="text-[#FF6B35] font-bold hover:underline">登录 →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
