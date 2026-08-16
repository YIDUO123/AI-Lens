import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, newsItems } from '@/db';
import { eq } from 'drizzle-orm';
import { getNewsCard } from '@/lib/ai/news-card';
import { getNewsFeedbackCounts } from '@/lib/actions/news-feedback';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NewsFeedback } from '@/components/digest/news-feedback';
import { NewsDims } from '@/components/digest/news-dims';
import { CardBody } from '@/components/digest/card-body';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const runtime = 'nodejs';
export const revalidate = 3600; // 卡片内容基本不变

const CAT_LABEL: Record<string, string> = {
  'ai-models': '🧠 模型', 'ai-products': '🚀 产品', industry: '📊 行业', paper: '📄 论文', tip: '💡 技巧',
};

export default async function NewsCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [item] = await db.select().from(newsItems).where(eq(newsItems.id, id)).limit(1);
  if (!item) notFound();

  // 只读缓存,不在这里阻塞生成:命中就 server 渲染(快 + SEO),没命中交给 CardBody 客户端异步生成
  const card = await getNewsCard(id);

  const session = await auth.api.getSession({ headers: await headers() });
  const fb = await getNewsFeedbackCounts(id, session?.user?.id || null);

  return (
    <div className="container max-w-3xl py-10 pb-20">
      <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回 AI 资讯
      </Link>

      <article className="bg-cream border-2 border-ink rounded-2xl px-6 py-10 md:px-12 shadow-brutal">
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className="rounded bg-coral text-white">{CAT_LABEL[item.category || ''] || '资讯'}</Badge>
          {item.source && <Badge className="rounded bg-ink text-white">{item.source}</Badge>}
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-[-0.02em] leading-[1.2] mb-4">{item.title}</h1>

        {item.summary && <p className="text-base text-ink-soft leading-relaxed mb-4">{item.summary}</p>}

        {/* 六维:缓存命中 server 渲染;否则客户端异步生成(首屏不阻塞) */}
        {card ? <NewsDims tldr={card.tldr} dims={card.dims} /> : <CardBody newsId={id} fallbackSummary={item.summary} />}

        {/* 操作区:原文 + 反馈 */}
        <div className="mt-8 pt-6 border-t border-dashed border-line flex flex-wrap items-center gap-3">
          {(item.url || item.permalink) && (
            <a
              href={item.url || item.permalink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-full text-sm font-bold hover:opacity-90"
            >
              <ExternalLink className="w-4 h-4" /> 读原文
            </a>
          )}
        </div>

        <div className="mt-4">
          <NewsFeedback newsId={id} initUp={fb.up} initDown={fb.down} initMyVote={fb.myVote} />
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          六维拆解由 AI Lens 自动生成 · 帮你 5 分钟读懂一条资讯 · 仅供参考,以原文为准
        </div>
      </article>
    </div>
  );
}
