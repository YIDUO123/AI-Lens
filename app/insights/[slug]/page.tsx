import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { getArticleBySlug, getInteractionCounts, getUserInteractionForItem, getComments } from '@/lib/db/queries';
import { MarkdownContent } from '@/components/content/markdown-content';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { LikeButton, SaveButton } from '@/components/interactions/reaction-buttons';
import { CommentsSection } from '@/components/interactions/comments-section';

export const revalidate = 300; // 5 分钟 · 你内容不是分钟级更新的

const SITE = process.env.BETTER_AUTH_URL || 'https://ai-lens-six.vercel.app';

const CAT_MAP: Record<string, { label: string; classes: string }> = {
  thinking:   { label: '🧭 行业思考', classes: 'bg-ink text-white' },
  'hands-on': { label: '🛠️ 上手体验', classes: 'bg-coral text-white' },
  method:     { label: '📐 方法论',   classes: 'bg-gold text-ink' },
  industry:   { label: '📊 行业观察', classes: 'bg-teal text-white' },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: '未找到' };
  const catName = CAT_MAP[article.category]?.label || article.category;
  return {
    title: article.title,
    description: article.excerpt || `${article.title} · 来自 AI Lens 的 PM 视角洞察`,
    keywords: ['AI Lens', 'AI 洞察', 'PM 视角', catName, article.title],
    authors: [{ name: article.authorName }],
    openGraph: {
      title: article.title,
      description: article.excerpt || article.title,
      type: 'article',
      publishedTime: new Date(article.publishedAt).toISOString(),
      modifiedTime: new Date(article.updatedAt || article.publishedAt).toISOString(),
      authors: [article.authorName],
      section: catName,
      url: `${SITE}/insights/${article.slug}`,
    },
    alternates: { canonical: `${SITE}/insights/${article.slug}` },
  };
}

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
  const publishedDate = new Date(article.publishedAt).toISOString();
  const modifiedDate = new Date(article.updatedAt || article.publishedAt).toISOString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || article.title,
    image: `${SITE}/opengraph-image`,
    author: { '@type': 'Person', name: article.authorName, url: `${SITE}/about` },
    publisher: {
      '@type': 'Organization',
      name: 'AI Lens',
      logo: { '@type': 'ImageObject', url: `${SITE}/opengraph-image` },
    },
    datePublished: publishedDate,
    dateModified: modifiedDate,
    mainEntityOfPage: `${SITE}/insights/${article.slug}`,
    articleSection: catInfo.label,
    inLanguage: 'zh-CN',
    wordCount: article.body?.length || 0,
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: counts.likes },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: counts.comments },
    ],
  };

  return (
    <div className="container max-w-3xl py-10 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
            <LikeButton targetType="article" targetId={article.id} initialLiked={userState.liked} likeCount={counts.likes} isLoggedIn={!!currentUserId} size="sm" showCount />
            <SaveButton targetType="article" targetId={article.id} initialSaved={userState.saved} saveCount={counts.saves} isLoggedIn={!!currentUserId} size="sm" showCount />
          </div>
        </div>

        <MarkdownContent>{article.body}</MarkdownContent>

        <div className="mt-12 pt-6 border-t border-dashed border-line text-sm text-muted-foreground text-center">
          — {article.authorName} · {formatDate(article.publishedAt)}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <LikeButton targetType="article" targetId={article.id} initialLiked={userState.liked} likeCount={counts.likes} isLoggedIn={!!currentUserId} showCount />
          <SaveButton targetType="article" targetId={article.id} initialSaved={userState.saved} saveCount={counts.saves} isLoggedIn={!!currentUserId} />
        </div>

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
