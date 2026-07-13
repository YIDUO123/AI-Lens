/**
 * /admin/insights · 洞察长文列表
 * 草稿 + 已发布双区 · 顶部新建按钮
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, articles } from '@/db';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FilePlus, FileText, AlertCircle } from 'lucide-react';
import { createInsightDraft } from '@/lib/actions/insights';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const dynamic = 'force-dynamic';

export default async function AdminInsightsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/insights');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  const [drafts, published] = await Promise.all([
    db.select().from(articles).where(eq(articles.isDraft, true)).orderBy(desc(articles.updatedAt)).limit(100),
    db.select().from(articles).where(eq(articles.isDraft, false)).orderBy(desc(articles.publishedAt)).limit(100),
  ]);

  async function newDraft() {
    'use server';
    const { id } = await createInsightDraft();
    redirect(`/admin/insights/${id}`);
  }

  return (
    <div className="container max-w-5xl py-10 pb-24">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Insights Editor · 洞察编辑</div>
          <h1 className="text-4xl font-black tracking-[-0.03em] leading-tight mb-3">
            编辑<em className="accent">洞察长文</em>
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            Markdown 双栏编辑器 · 实时预览 · 存草稿随时改 · 发布后自动同步到 /insights。
          </p>
        </div>

        <form action={newDraft}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition whitespace-nowrap"
          >
            <FilePlus className="w-4 h-4" /> 新建长文
          </button>
        </form>
      </div>

      {drafts.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h2 className="text-lg font-black">草稿区</h2>
            <span className="text-sm font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
              {drafts.length}
            </span>
          </div>
          <div className="space-y-2">
            {drafts.map((a) => <InsightListItem key={a.id} a={a} isDraft />)}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-green-600" />
          <h2 className="text-lg font-black">已发布</h2>
          <span className="text-sm font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
            {published.length}
          </span>
        </div>
        {published.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-line rounded-xl">
            还没发布任何长文
          </div>
        ) : (
          <div className="space-y-2">
            {published.map((a) => <InsightListItem key={a.id} a={a} />)}
          </div>
        )}
      </section>
    </div>
  );
}

const CAT_LABEL: Record<string, string> = {
  thinking: '思考',
  'hands-on': '实操',
  method: '方法',
  industry: '行业',
};

function InsightListItem({ a, isDraft }: { a: any; isDraft?: boolean }) {
  const bodyLen = (a.body || '').length;
  const isExternal = !!a.sourceUrl;
  return (
    <Link
      href={`/admin/insights/${a.id}`}
      className="flex items-center gap-3 bg-cream border-2 border-ink rounded-xl p-4 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition"
    >
      <div className="w-12 h-12 rounded-lg border-2 border-ink grid place-items-center flex-shrink-0 text-lg"
           style={{ background: isExternal ? '#eff6ff' : '#fff' }}>
        {isExternal ? '🔗' : '✍️'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm truncate mb-0.5">{a.title || '未命名'}</div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <span className="font-mono uppercase">{CAT_LABEL[a.category] || a.category}</span>
          <span>·</span>
          <span>{bodyLen} 字</span>
          {isExternal && <><span>·</span><span className="text-blue-600">外部来源</span></>}
          {a.featured && <><span>·</span><span className="text-coral font-bold">⭐ 精选</span></>}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}
