import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getTeardownBySlug, getInteractionCounts, getUserInteractionForItem, getComments } from '@/lib/db/queries';
import { MarkdownContent } from '@/components/content/markdown-content';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { LikeButton, SaveButton } from '@/components/interactions/reaction-buttons';
import { ViewBeacon } from '@/components/interactions/view-beacon';
import { CommentsSection } from '@/components/interactions/comments-section';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const revalidate = 300; // 5 分钟 · 你内容不是分钟级更新的

const CAT_LABEL: Record<string, string> = {
  chat: '💬 对话',
  coding: '💻 编码',
  creative: '🎨 AIGC 创作',
  enterprise: '🏢 企业级',
};

export default async function TeardownDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTeardownBySlug(slug);
  if (!t) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const currentUserId = session?.user?.id || null;
  const isAdmin = ((session?.user as any)?.role || 'reader') === 'admin';

  const [counts, userState, commentList] = await Promise.all([
    getInteractionCounts('teardown', t.id),
    currentUserId ? getUserInteractionForItem(currentUserId, 'teardown', t.id) : Promise.resolve({ liked: false, saved: false }),
    getComments('teardown', t.id),
  ]);

  return (
    <div className="container max-w-3xl py-10 pb-20">
      <ViewBeacon targetType="teardown" targetId={t.id} slug={t.slug} category={t.category} />
      <Link href="/teardowns#library" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回拆解库
      </Link>

      <article className="bg-cream border-2 border-ink rounded-2xl px-8 py-12 md:px-14 shadow-brutal">
        <div className="flex flex-wrap gap-2 mb-4">
          {t.isDomestic && <Badge className="rounded bg-red-500 text-white">🇨🇳 国内</Badge>}
          <Badge className="rounded bg-teal text-white">{CAT_LABEL[t.category] || t.category}</Badge>
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-[-0.03em] leading-[1.15] mb-3">
          {t.title}
        </h1>

        {t.positioning && (
          <p className="text-lg text-ink-soft leading-relaxed mb-4">{t.positioning}</p>
        )}

        <div className="flex justify-between items-center text-sm text-muted-foreground pb-4 border-b-2 border-dashed border-line mb-8 flex-wrap gap-3">
          <span>{formatDate(t.publishedAt)} · {t.readTime} 分钟 · {t.authorName}</span>
          <div className="flex items-center gap-2">
            <LikeButton targetType="teardown" targetId={t.id} initialLiked={userState.liked} likeCount={counts.likes} isLoggedIn={!!currentUserId} size="sm" showCount />
            <SaveButton targetType="teardown" targetId={t.id} initialSaved={userState.saved} saveCount={counts.saves} isLoggedIn={!!currentUserId} size="sm" showCount />
            {t.productUrl && (
              <a href={t.productUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 bg-coral text-white rounded-full text-xs font-bold hover:opacity-90">
                <ExternalLink className="w-3 h-3" /> 官网
              </a>
            )}
          </div>
        </div>

        <MarkdownContent>{t.body}</MarkdownContent>

        <div className="mt-12 pt-6 border-t border-dashed border-line text-sm text-muted-foreground text-center">
          — {t.authorName} · {formatDate(t.publishedAt)}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <LikeButton targetType="teardown" targetId={t.id} initialLiked={userState.liked} likeCount={counts.likes} isLoggedIn={!!currentUserId} showCount />
          <SaveButton targetType="teardown" targetId={t.id} initialSaved={userState.saved} saveCount={counts.saves} isLoggedIn={!!currentUserId} />
        </div>

        <CommentsSection
          targetType="teardown"
          targetId={t.id}
          comments={commentList as any}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </article>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
