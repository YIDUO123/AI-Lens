import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, dailyPicks } from '@/db';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPicksPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/picks');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  const [drafts, published] = await Promise.all([
    db.select().from(dailyPicks).where(eq(dailyPicks.isDraft, true)).orderBy(desc(dailyPicks.pickedAt)).limit(50),
    db.select().from(dailyPicks).where(eq(dailyPicks.isDraft, false)).orderBy(desc(dailyPicks.pickedAt)).limit(50),
  ]);

  return (
    <div className="container max-w-5xl py-10 pb-24">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>

      <div className="mb-8">
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Daily Picks Editor · 精选编辑</div>
        <h1 className="text-4xl font-black tracking-[-0.03em] leading-tight mb-3">
          编辑每日 <em className="accent">创投精选</em>
        </h1>
        <p className="text-sm text-ink-soft leading-relaxed">
          自动抓取的 HackerNews Top 会进入草稿区,补完 6 维分析(或点 <b>AI 兜底</b>)后发布到公开页。
        </p>
      </div>

      {drafts.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h2 className="text-lg font-black">草稿区</h2>
            <span className="text-sm font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
              {drafts.length} 待编辑
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {drafts.map((p) => <PickListItem key={p.id} p={p} isDraft />)}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-black">已发布</h2>
          <span className="text-sm font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
            {published.length} 篇
          </span>
        </div>
        {published.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-line rounded-xl">
            还没发布任何精选
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {published.map((p) => <PickListItem key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function PickListItem({ p, isDraft }: { p: any; isDraft?: boolean }) {
  const filled = [p.positioning, p.painPoint, p.solution, p.designHighlight, p.vibeCoding, p.commercial].filter(Boolean).length;
  return (
    <Link
      href={`/admin/picks/${p.id}`}
      className="bg-cream border-2 border-ink rounded-xl p-4 flex items-center gap-3 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition"
    >
      <div className="w-10 h-10 rounded-lg grid place-items-center text-lg text-white flex-shrink-0" style={{ background: p.logoColor || '#1a1a1a' }}>
        {p.logo || '🚀'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm truncate flex items-center gap-1.5">
          {p.name}
          {isDraft && filled === 0 && <Sparkles className="w-3 h-3 text-amber-600" />}
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
          <span>{p.source}</span>
          <span>·</span>
          <span className={filled >= 6 ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
            {filled}/6 维已填
          </span>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}
