import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTeardownBySlug } from '@/lib/db/queries';
import { MarkdownContent } from '@/components/content/markdown-content';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const revalidate = 60;

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

  return (
    <div className="container max-w-3xl py-10 pb-20">
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

        <div className="flex justify-between items-center text-sm text-muted-foreground pb-6 border-b-2 border-dashed border-line mb-8 flex-wrap gap-3">
          <span>{formatDate(t.publishedAt)} · {t.readTime} 分钟阅读 · {t.authorName}</span>
          {t.productUrl && (
            <a href={t.productUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-coral text-white rounded-lg font-bold text-sm hover:opacity-90 transition">
              <ExternalLink className="w-3.5 h-3.5" /> 访问官网
            </a>
          )}
        </div>

        <MarkdownContent>{t.body}</MarkdownContent>

        <div className="mt-12 pt-6 border-t border-dashed border-line text-sm text-muted-foreground text-center">
          — {t.authorName} · {formatDate(t.publishedAt)}
        </div>
      </article>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
