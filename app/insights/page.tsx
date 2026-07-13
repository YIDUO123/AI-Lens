import Link from 'next/link';
import { db, articles } from '@/db';
import { desc, eq } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const revalidate = 300; // 5 分钟 · 你内容不是分钟级更新的

type SP = { cat?: string };

const CAT_MAP: Record<string, { label: string; classes: string }> = {
  thinking:   { label: '🧭 行业思考', classes: 'bg-ink text-white' },
  'hands-on': { label: '🛠️ 上手体验', classes: 'bg-coral text-white' },
  method:     { label: '📐 方法论',   classes: 'bg-gold text-ink' },
  industry:   { label: '📊 行业观察', classes: 'bg-teal text-white' },
};

export default async function InsightsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const cat = sp.cat || 'all';

  const [allArticles, featured] = await Promise.all([
    db.select().from(articles).orderBy(desc(articles.publishedAt)),
    db.select().from(articles).where(eq(articles.featured, true)).limit(1),
  ]);

  const filtered = cat === 'all' ? allArticles : allArticles.filter((a) => a.category === cat);
  const featuredArticle = featured[0];
  const nonFeatured = filtered.filter((a) => a.id !== featuredArticle?.id);

  return (
    <>
      {/* 页头 */}
      <section className="container">
        <div className="border-b-2 border-ink py-15 pb-10 pt-15 mb-10">
          <span className="inline-block bg-ink text-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest rounded mb-4">
            Deep Insights · PM 观察笔记
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] mb-4">
            PM 视角的 <em className="accent">AI 洞察</em>
          </h1>
          <p className="max-w-2xl text-ink-soft leading-relaxed">
            资讯是数据,拆解是结构,洞察才是判断。<br />
            这里是我的观察笔记 —— 关于 AI 产品的取舍、上手体验、以及 PM 该怎么想这些新东西。
          </p>
        </div>
      </section>

      <div className="container pb-20">
        {/* 分类 chip */}
        <div className="flex flex-wrap gap-2.5 mb-8">
          <CatChip href="/insights" active={cat === 'all'} label="全部" />
          <CatChip href="/insights?cat=thinking"  active={cat === 'thinking'}  label="🧭 行业思考" />
          <CatChip href="/insights?cat=hands-on"  active={cat === 'hands-on'}  label="🛠️ 上手体验" />
          <CatChip href="/insights?cat=method"    active={cat === 'method'}    label="📐 方法论" />
          <CatChip href="/insights?cat=industry"  active={cat === 'industry'}  label="📊 行业观察" />
        </div>

        {/* 精选置顶(只在 all 分类时显示)*/}
        {cat === 'all' && featuredArticle && (
          <FeaturedCard article={featuredArticle} />
        )}

        {/* 文章网格 */}
        {nonFeatured.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-line rounded-xl">
            <h4 className="text-lg font-bold mb-2">该分类下暂无文章</h4>
            <p className="text-sm text-muted-foreground">试试其他分类</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nonFeatured.map((a, i) => {
              const catInfo = CAT_MAP[a.category] || CAT_MAP.thinking;
              return (
                <Link
                  key={a.id}
                  href={`/insights/${a.slug}`}
                  className="relative bg-cream border-2 border-ink rounded-2xl p-7 shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition-all flex flex-col min-h-[260px]"
                >
                  <span className="absolute top-5 right-6 font-serif text-4xl font-black text-bg-alt leading-none">
                    {String(i + (featuredArticle ? 2 : 1)).padStart(2, '0')}
                  </span>

                  <Badge className={`self-start mb-3.5 rounded text-[10px] font-black tracking-widest uppercase ${catInfo.classes}`}>
                    {catInfo.label}
                  </Badge>

                  <h3 className="text-xl font-bold tracking-tight leading-snug mb-2.5">
                    {renderTitle(a.title)}
                  </h3>

                  <p className="text-sm text-ink-soft leading-relaxed flex-1 mb-4 line-clamp-3">
                    {a.excerpt}
                  </p>

                  <div className="flex justify-between items-center pt-3 border-t border-dashed border-line text-[11px] text-muted-foreground">
                    <span>{formatDate(a.publishedAt)} · {a.readTime} 分钟</span>
                    <span className="font-bold text-ink group-hover:text-coral">继续读 →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function CatChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 border-2 rounded-full text-sm font-bold shadow-brutal-sm transition ${
        active ? 'bg-ink text-background border-ink' : 'bg-cream border-ink hover:-translate-y-0.5'
      }`}
    >
      {label}
    </Link>
  );
}

function FeaturedCard({ article }: { article: any }) {
  const catInfo = CAT_MAP[article.category] || CAT_MAP.thinking;
  return (
    <article className="relative bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-ink rounded-2xl p-10 mb-10 grid md:grid-cols-[1fr_380px] gap-10 items-center shadow-brutal overflow-hidden">
      <div className="absolute top-5 -right-8 rotate-[35deg] bg-coral text-white text-[10px] font-black tracking-widest px-10 py-1">
        FEATURED
      </div>

      <div>
        <div className="text-[11px] font-black tracking-widest uppercase text-coral mb-3">✨ 精选置顶 · Editor's Pick</div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3.5">
          {renderTitle(article.title)}
        </h2>
        <p className="text-[15px] text-ink-soft leading-relaxed mb-5">{article.excerpt}</p>
        <div className="flex items-center gap-3.5 text-xs text-muted-foreground mb-6">
          <span>📅 {formatDate(article.publishedAt)}</span>
          <span>·</span>
          <span>⏱️ {article.readTime} 分钟阅读</span>
          <span>·</span>
          <Badge className={`rounded ${catInfo.classes}`}>{catInfo.label}</Badge>
        </div>
        <Link href={`/insights/${article.slug}`} className="inline-flex items-center gap-2 bg-coral text-white border-2 border-ink px-5 py-2.5 rounded-lg font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition">
          阅读全文 →
        </Link>
      </div>

      <div className="bg-cream border-2 border-ink rounded-xl p-6 shadow-brutal-sm font-serif">
        <div className="text-[10px] font-black tracking-widest text-muted-foreground mb-3">CORE ARGUMENT</div>
        <div className="text-5xl font-black text-coral leading-none mb-1">3 层</div>
        <p className="text-xs text-ink-soft mb-3.5 font-sans">PM 需要穿透的能力判断层</p>

        <div className="space-y-2 font-sans text-xs">
          <FvRow label="模型能力上限" tier="技术层" />
          <FvRow label="可复现性 / 幻觉" tier="工程层" />
          <FvRow label="用户容忍度" tier="产品层" />
        </div>

        <p className="mt-4 pt-3 border-t border-dashed border-line text-[11px] text-ink-soft leading-relaxed font-sans">
          大多数 PM 只看第 1 层,少数看到第 3 层。<br />
          做出爆款的,是能同时判断三层的人。
        </p>
      </div>
    </article>
  );
}

function FvRow({ label, tier }: { label: string; tier: string }) {
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-dashed border-line last:border-b-0">
      <span className="text-ink-soft">{label}</span>
      <b className="text-coral font-serif text-sm">{tier}</b>
    </div>
  );
}

function renderTitle(title: string): React.ReactNode {
  // 把 markdown 里的 <em>...</em> 或 *...* 变成珊瑚色斜体
  const parts = title.split(/(<em>[^<]+<\/em>|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    const em = p.match(/^<em>(.+)<\/em>$/) || p.match(/^\*(.+)\*$/);
    if (em) return <em key={i} className="accent">{em[1]}</em>;
    return p;
  });
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
