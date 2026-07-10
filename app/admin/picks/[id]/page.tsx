import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, dailyPicks } from '@/db';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { PickEditor } from './pick-editor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // AI 兜底生成可能要 20-30 秒 · Hobby 免费版上限 60 秒

export default async function AdminPickDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/picks');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  const { id } = await params;
  const [pick] = await db.select().from(dailyPicks).where(eq(dailyPicks.id, id)).limit(1);
  if (!pick) notFound();

  return (
    <div className="container max-w-4xl py-10 pb-24">
      <Link href="/admin/picks" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回列表
      </Link>

      <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm mb-6">
        <div className="grid grid-cols-[56px_1fr_auto] gap-4 items-center">
          <div className="w-14 h-14 rounded-xl grid place-items-center text-2xl text-white border-2 border-ink" style={{ background: pick.logoColor || '#1a1a1a' }}>
            {pick.logo || '🚀'}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight">{pick.name}</h1>
            <p className="text-sm text-ink-soft mt-1">{pick.tagline}</p>
            <div className="text-[11px] text-muted-foreground mt-1">
              {pick.source} · 分类: {pick.category} · 分数: {pick.score}
            </div>
          </div>
          <a href={pick.url || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-background rounded-lg text-sm font-bold hover:bg-ink/90">
            <ExternalLink className="w-3.5 h-3.5" /> 访问
          </a>
        </div>
      </div>

      <PickEditor pick={pick as any} />
    </div>
  );
}
