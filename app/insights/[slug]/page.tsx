import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getArticleBySlug, getInteractionCounts, getUserInteractionForItem, getComments } from '@/lib/db/queries';
import { MarkdownContent } from '@/components/content/markdown-content';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { LikeButton, SaveButton } from '@/components/interactions/reaction-buttons';
import { CommentsSection } from '@/components/interactions/comments-section';

export const revalidate = 60;

const CAT_MAP: Record<string, { label: string; classes: string }> = {
  thinking:   { label: '🧭 行业思考', classes: 'bg-ink text-white' },
  'hands-on': { label: '🛠️ 上手体验', classes: 'bg-coral text-white' },
  method:     { label: '📐 方法论',   classes: 'bg-gold text-ink' },
  industry:   { label: '📊 行业观察', classes: 'bg-teal text-white' },
};

export default async function InsightDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const currentUserId = session?.user?.id || null;
  const isAdmin = ((session?.user as any)?.role || 'reader') === 'admin';

  const [counts, userState, commentList] = await Promise.all([
    getInteractionCounts('article', article.id),
    currentUserId ? getUserInteractionForItem(currentUserId, 'article', article.id) : Promise.resolve({ liked: false, saved: false }),
    getComments('article', article.id),
  ]);

  const catInfo = CAT_MAP[article.category] || CAT_MAP.thinking;

  return (
    <div className="container max-w-3xl py-10 pb-20">
      <Link href="/insights" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回洞察列表
      </Link>

      <article className="bg-cream border-2 border-ink rounded-2xl px-8 py-12 md:px-14 shadow-brutal">
        <Badge className={`rounded mb-4 ${catInfo.classes}`}>{catInfo.label}</Badge>

        <h1 className="text-4xl md:text-5xl font-black tracking-[-0.03em] leading-[1.15] mb-3">
          {article.title}
        </h1>

        <div className="flex justify-between items-center text-sm text-muted-foreground pb-4 border-b-2 border-dashed border-line mb-8 flex-wrap gap-3">
          <span>{formatDate(article.publishedAt)} · {article.readTime} 分钟阅读 · {article.authorName}</span>
          <div className="flex items-center gap-2">
            <LikeButton
              targetType="article"
              targetId={article.id}
              initialLiked={userState.liked}
              likeCount={counts.likes}
              isLoggedIn={!!currentUserId}
              size="sm"
              showCount
            />
            <SaveButton
              targetType="article"
              targetId={article.id}
              initialSaved={userState.saved}
              saveCount={counts.saves}
              isLoggedIn={!!currentUserId}
              size="sm"
              showCount
            />
          </div>
        </div>

        <MarkdownContent>{article.body}</MarkdownContent>

        <div className="mt-12 pt-6 border-t border-dashed border-line text-sm text-muted-foreground text-center">
          — {article.authorName} · {formatDate(article.publishedAt)}
        </div>

        {/* 底部再来一组交互按钮,阅读完后好点 */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <LikeButton
            targetType="article"
            targetId={article.id}
            initialLiked={userState.liked}
            likeCount={counts.likes}
            isLoggedIn={!!currentUserId}
            showCount
          />
          <SaveButton
            targetType="article"
            targetId={article.id}
            initialSaved={userState.saved}
            saveCount={counts.saves}
            isLoggedIn={!!currentUserId}
          />
        </div>

        {/* 评论 */}
        <CommentsSection
          targetType="article"
          targetId={article.id}
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
