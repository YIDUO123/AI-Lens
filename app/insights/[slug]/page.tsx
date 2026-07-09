import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleBySlug } from '@/lib/db/queries';
import { MarkdownContent } from '@/components/content/markdown-content';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

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

        <div className="text-sm text-muted-foreground pb-6 border-b-2 border-dashed border-line mb-8">
          {formatDate(article.publishedAt)} · {article.readTime} 分钟阅读 · {article.authorName}
        </div>

        <MarkdownContent>{article.body}</MarkdownContent>

        <div className="mt-12 pt-6 border-t border-dashed border-line text-sm text-muted-foreground text-center">
          — {article.authorName} · {formatDate(article.publishedAt)}
        </div>
      </article>

      {/* 评论占位 · Batch 15 加 giscus 或自建 */}
      <section className="mt-8 rounded-2xl border-2 border-dashed border-line bg-cream/50 p-10 text-center">
        <div className="text-xs font-black tracking-widest text-coral mb-2">💬 读者讨论(即将上线)</div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          评论系统已就绪(comments 表已建),接下来一个 batch 会在这里挂上真实评论组件,支持登录用户发言 + 树形回复。
        </p>
      </section>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
