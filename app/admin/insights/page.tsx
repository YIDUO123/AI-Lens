/**
 * /admin/insights · 洞察长文列表
 * 草稿 + 已发布双区 · 顶部新建按钮 · 支持批量选中删除
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, articles } from '@/db';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, FilePlus, FileText, AlertCircle } from 'lucide-react';
import { createInsightDraft } from '@/lib/actions/insights';
import { InsightsListWithBulkDelete } from './insights-list';

export const runtime = 'nodejs';
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
            ✍️ Markdown 双栏编辑器 · 实时预览 · 存草稿随时改 · 发布后自动同步到 /insights · 支持批量删除。
          </p>
        </div>

        <form action={newDraft}>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition whitespace-nowrap">
            <FilePlus className="w-4 h-4" /> 新建长文
          </button>
        </form>
      </div>

      {drafts.length > 0 && (
        <InsightsListWithBulkDelete
          items={drafts as any[]}
          headerTitle="草稿区"
          headerIcon={<AlertCircle className="w-4 h-4 text-amber-600" />}
        />
      )}

      <InsightsListWithBulkDelete
        items={published as any[]}
        headerTitle="已发布"
        headerIcon={<FileText className="w-4 h-4 text-green-600" />}
      />
    </div>
  );
}
