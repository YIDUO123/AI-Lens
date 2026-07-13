import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { CollectForm } from './collect-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const dynamic = 'force-dynamic';

export default async function CollectPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/collect');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  return (
    <div className="container max-w-3xl py-10 pb-24">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>

      <div className="mb-8">
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">URL Collector · 外部观点采集器</div>
        <h1 className="text-4xl font-black tracking-[-0.03em] leading-tight mb-3">
          粘个链接 · <em className="accent">收藏别人的好观点</em>
        </h1>
        <p className="text-sm text-ink-soft leading-relaxed">
          从微信 / 小红书 / X / Substack 等任意平台粘 URL,系统自动抓元数据,
          你写一段"AI Lens 编辑视角"评注,发布后与原创长文并列在洞察专栏,始终标明原始出处。
        </p>
      </div>

      <CollectForm />
    </div>
  );
}
