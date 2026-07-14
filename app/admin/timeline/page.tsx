/**
 * /admin/timeline · 时间线快速添加 · 简易版
 * 不做完整编辑器 · 只有"新增版本"表单 + 现有列表(可删)
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, timelineVersions } from '@/db';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TimelineForm } from './timeline-form';
import { DeleteBtn } from './delete-btn';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminTimelinePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/timeline');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  const list = await db.select().from(timelineVersions).orderBy(desc(timelineVersions.dateOrder)).limit(80);

  return (
    <div className="container max-w-5xl py-10 pb-24">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>

      <div className="mb-8">
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Timeline Editor · 时间线编辑</div>
        <h1 className="text-4xl font-black tracking-[-0.03em] leading-tight mb-3">
          添加 <em className="accent">AI 家族版本</em>
        </h1>
        <p className="text-sm text-ink-soft leading-relaxed">
          🔄 每有新版本发布(如 GPT-5.6) · 在这里填一条 · 立刻上 /timeline · 无需改代码。
        </p>
      </div>

      <TimelineForm />

      <section className="mt-12">
        <h2 className="text-lg font-black mb-4">📚 最近 80 条 · 可删</h2>
        <div className="space-y-2">
          {list.map((v) => <TimelineRow key={v.id} v={v} />)}
        </div>
      </section>
    </div>
  );
}

const FAM_LABEL: Record<string, string> = {
  openai: '🤖 OpenAI', anthropic: '🧠 Anthropic', google: '🔷 Google', cursor: '⚡ Cursor', domestic: '🇨🇳 国内',
};

function TimelineRow({ v }: { v: any }) {
  return (
    <div className="flex items-center gap-3 bg-cream border-2 border-ink rounded-xl p-3 shadow-brutal-sm">
      <span className="font-mono text-xs px-2 py-1 bg-bg-alt rounded-md">{v.dateLabel}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{FAM_LABEL[v.family] || v.family}</span>
      <span className="font-bold text-sm flex-1 truncate">{v.title}</span>
      {v.breakthrough && <span className="text-xs text-amber-600 font-bold">⭐ 突破</span>}
      <span className="text-[11px] text-muted-foreground font-mono">{v.version}</span>
      <DeleteBtn id={v.id} title={v.title} />
    </div>
  );
}
