/**
 * /admin/insights/[id] · 单篇长文编辑器容器
 */
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, articles } from '@/db';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { InsightEditor } from './insight-editor';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export default async function AdminInsightDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/insights');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  const { id } = await params;
  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!article) notFound();

  return (
    <div className="container max-w-6xl py-8 pb-24">
      <div className="flex items-center justify-between gap-4 mb-5">
        <Link href="/admin/insights" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </Link>
        {!article.isDraft && (
          <a
            href={`/insights/${article.slug}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-coral hover:underline"
          >
            查看已发布页 <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <InsightEditor article={article as any} />
    </div>
  );
}
