import { db, articles } from '@/db';
import { desc, eq } from 'drizzle-orm';
import { InsightsBrowser } from '@/components/insights/insights-browser';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const revalidate = 300; // 5 分钟 · 你内容不是分钟级更新的

type SP = { cat?: string };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const cat = sp.cat || 'all';

  const [allArticles, featured] = await Promise.all([
    db.select().from(articles).orderBy(desc(articles.publishedAt)),
    db.select().from(articles).where(eq(articles.featured, true)).limit(1),
  ]);

  const featuredArticle = featured[0] || null;
  const published = allArticles.filter((a) => !a.isDraft);

  return (
    <>
      {/* 页头 */}
      <section className="container">
        <div className="border-b-2 border-ink pt-12 pb-10 mb-10">
          <span className="inline-block bg-ink text-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest rounded mb-4">
            Deep Insights · PM 观察笔记
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] mb-4">
            PM 视角的 <em className="accent">AI 洞察</em>
          </h1>
          <p className="max-w-2xl text-ink-soft leading-relaxed">
            资讯是数据,拆解是结构,洞察才是判断。<br />
            这里是我们的观察笔记 —— 关于 AI 产品的取舍、上手体验、以及 PM 该怎么想这些东西。
          </p>
        </div>
      </section>

      <div className="container pb-20">
        {/* 分类切换 + 文章网格 · 纯客户端筛选 */}
        <InsightsBrowser articles={published} featured={featuredArticle} />
      </div>
    </>
  );
}
