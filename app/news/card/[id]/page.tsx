import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, newsItems } from '@/db';
import { eq } from 'drizzle-orm';
import { getNewsCard, ensureNewsCards } from '@/lib/ai/news-card';
import { getNewsFeedbackCounts } from '@/lib/actions/news-feedback';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ReadAloud } from '@/components/digest/read-aloud';
import { NewsFeedback } from '@/components/digest/news-feedback';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const runtime = 'nodejs';
export const revalidate = 3600; // 卡片内容基本不变

const CAT_LABEL: Record<string, string> = {
  'ai-models': '🧠 模型', 'ai-products': '🚀 产品', industry: '📊 行业', paper: '📄 论文', tip: '💡 技巧',
};

const DIM_META: { key: keyof import('@/db').NewsCardDims; label: string; icon: string }[] = [
  { key: 'coreFact',    label: '核心事实', icon: '🎯' },
  { key: 'keyData',     label: '关键数据', icon: '📊' },
  { key: 'whyMatters',  label: '为什么重要', icon: '💡' },
  { key: 'whoAffected', label: '谁受影响', icon: '👥' },
  { key: 'context',     label: '背景脉络', icon: '🧩' },
  { key: 'pmInsight',   label: 'PM 视角 · 行动启示', icon: '🧭' },
];

export default async function NewsCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [item] = await db.select().from(newsItems).where(eq(newsItems.id, id)).limit(1);
  if (!item) notFound();

  // 卡片没生成过 → 现场补一张(点进来就能看,不用等 cron)
  let card = await getNewsCard(id);
  if (!card) {
    try {
      await ensureNewsCards([id]);
      card = await getNewsCard(id);
    } catch { /* 生成失败下面兜底 */ }
  }

  const dims = card?.dims;

  // 反馈计数 + 我的票
  const session = await auth.api.getSession({ headers: await headers() });
  const fb = await getNewsFeedbackCounts(id, session?.user?.id || null);

  // 朗读文本:TL;DR + 六维拼一段
  const readText = [
    card?.tldr,
    dims && `核心事实。${dims.coreFact}`,
    dims && `关键数据。${dims.keyData}`,
    dims && `为什么重要。${dims.whyMatters}`,
    dims && `谁受影响。${dims.whoAffected}`,
    dims && `背景脉络。${dims.context}`,
    dims && `PM 视角。${dims.pmInsight}`,
  ].filter(Boolean).join(' ');

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

        {/* TL;DR · 一句话核心 */}
        {card?.tldr && (
          <div className="bg-gold/20 border-2 border-ink rounded-xl px-4 py-3 mb-8 shadow-brutal-sm">
            <div className="text-[10px] font-black tracking-widest uppercase text-amber-700 mb-1">TL;DR · 一句话核心</div>
            <p className="text-lg font-bold leading-snug">{card.tldr}</p>
          </div>
        )}

        {/* 六维拆解 */}
        {dims ? (
          <div className="grid gap-3 md:grid-cols-2">
            {DIM_META.map((d) => (
              <div
                key={d.key}
                className={`border-2 border-ink rounded-xl p-4 bg-white ${d.key === 'pmInsight' ? 'md:col-span-2 bg-coral/5 border-coral' : ''}`}
              >
                <div className="text-[11px] font-black tracking-widest uppercase text-ink-soft mb-1.5">
                  {d.icon} {d.label}
                </div>
                <p className="text-sm leading-relaxed text-ink">{dims[d.key] || '暂无'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{item.summary || '六维卡片生成中,稍后刷新。'}</p>
        )}

        {/* 操作区:朗读 + 原文 + 反馈 */}
        <div className="mt-8 pt-6 border-t border-dashed border-line flex flex-wrap items-center gap-3">
          {readText && <ReadAloud text={readText} />}
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
