/**
 * /admin/teardowns/[id] · 单个拆解编辑器容器
 */
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, teardowns } from '@/db';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { TeardownEditor } from './teardown-editor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export default async function AdminTeardownDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/teardowns');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  const { id } = await params;
  const [teardown] = await db.select().from(teardowns).where(eq(teardowns.id, id)).limit(1);
  if (!teardown) notFound();

  const isDraft = teardown.slug.startsWith('draft-');

  return (
    <div className="container max-w-6xl py-8 pb-24">
      <div className="flex items-center justify-between gap-4 mb-5">
        <Link href="/admin/teardowns" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </Link>
        {!isDraft && (
          <a href={`/teardowns/${teardown.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-xs font-bold text-coral hover:underline">
            查看已发布页 <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <TeardownEditor teardown={teardown as any} isDraft={isDraft} />
    </div>
  );
}
