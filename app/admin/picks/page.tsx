import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, dailyPicks } from '@/db';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { PicksListWithBulkActions } from './bulk-actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminPicksPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/picks');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  const [drafts, published] = await Promise.all([
    db.select().from(dailyPicks).where(eq(dailyPicks.isDraft, true)).orderBy(desc(dailyPicks.pickedAt)).limit(50),
    db.select().from(dailyPicks).where(eq(dailyPicks.isDraft, false)).orderBy(desc(dailyPicks.pickedAt)).limit(100),
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
          🌟 自动抓取的 HackerNews Top **直接发布**到公开页 · 可随时点进单条**补 6 维**或**AI 兜底**填写 · 也可勾选批量删除清理。
        </p>
      </div>

      {drafts.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h2 className="text-lg font-black">草稿区 · 历史遗留</h2>
            <span className="text-sm font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
              {drafts.length}
            </span>
          </div>
          <PicksListWithBulkActions picks={drafts as any} isDraftSection />
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-black">🌟 已发布</h2>
          <span className="text-sm font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
            {published.length} 条
          </span>
        </div>
        {published.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-line rounded-xl">
            还没有精选 · 等 cron 抓取或手动添加
          </div>
        ) : (
          <PicksListWithBulkActions picks={published as any} />
        )}
      </section>
    </div>
  );
}
