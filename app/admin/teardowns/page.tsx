/**
 * /admin/teardowns · 产品拆解列表 · 支持批量选中删除
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, teardowns } from '@/db';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, FilePlus, FileText } from 'lucide-react';
import { createTeardownDraft } from '@/lib/actions/teardowns';
import { TeardownsListWithBulkDelete } from './teardowns-list';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminTeardownsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/teardowns');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  const list = await db.select().from(teardowns).orderBy(desc(teardowns.publishedAt)).limit(100);

  async function newDraft() {
    'use server';
    const { id } = await createTeardownDraft();
    redirect(`/admin/teardowns/${id}`);
  }

  return (
    <div className="container max-w-5xl py-10 pb-24">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Teardowns Editor · 拆解编辑</div>
          <h1 className="text-4xl font-black tracking-[-0.03em] leading-tight mb-3">
            编辑<em className="accent">产品拆解</em>
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            🔬 Markdown 双栏编辑器 · 实时预览 · AI 润色 · 图片粘贴 · 支持批量删除。
          </p>
        </div>

        <form action={newDraft}>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition whitespace-nowrap">
            <FilePlus className="w-4 h-4" /> 新建拆解
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-teal-600" />
        <h2 className="text-lg font-black">全部拆解</h2>
        <span className="text-sm font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
          {list.length}
        </span>
      </div>

      <TeardownsListWithBulkDelete items={list as any[]} />
    </div>
  );
}
