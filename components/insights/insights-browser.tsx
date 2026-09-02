'use client';

/**
 * 洞察专栏 · 分类切换 + 文章网格(客户端)
 * 全部文章由服务端一次传入,分类切换纯本地状态 · 零网络请求 · 不跳顶;
 * URL 用 replaceState 同步,保持分类页可分享/可刷新
 */
import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const CAT_MAP: Record<string, { label: string; classes: string }> = {
  thinking:   { label: '🧭 行业思考', classes: 'bg-ink text-white' },
  'hands-on': { label: '🛠️ 上手体验', classes: 'bg-coral text-white' },
  method:     { label: '📐 方法论',   classes: 'bg-gold text-ink' },
  industry:   { label: '📊 行业观察', classes: 'bg-teal text-white' },
};

const CATS = ['all', 'thinking', 'hands-on', 'method', 'industry'] as const;

const CAT_LABELS: Record<string, string> = {
  all: '🏷️ 全部',
  thinking: '🧭 行业思考',
  'hands-on': '🛠️ 上手体验',
  method: '📐 方法论',
  industry: '📊 行业观察',
};

export function InsightsBrowser({
  articles,
  featured,
}: {
  articles: any[];
  featured: any | null;
}) {
  const [cat, setCat] = useState('all');

  const pick = (next: string) => {
    if (next === cat) return;
    setCat(next);
    try {
      const url = new URL(window.location.href);
      if (next === 'all') url.searchParams.delete('cat');
      else url.searchParams.set('cat', next);
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  const nonFeatured = articles.filter((a) => a.id !== featured?.id);
  const visible = cat === 'all' ? nonFeatured : articles.filter((a) => a.category === cat);
  const showFeatured = cat === 'all' && featured;

  return (
    <>
      {/* 分类 chip · 移动端横向滑动 */}
      <div className="flex flex-wrap lg:flex-nowrap gap-2.5 mb-8 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATS.map((c) => (
          <CatChip key={c} active={cat === c} label={CAT_LABELS[c]} onClick={() => pick(c)} />
        ))}
      </div>

      {/* 精选置顶 · 仅在 all 分类时显示 */}
      {showFeatured && <FeaturedCard article={featured} />}

      {/* 文章网格 */}
      {visible.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-line rounded-xl">
          <h4 className="text-lg font-bold mb-2">该分类下暂无文章</h4>
          <p className="text-sm text-muted-foreground">试试其他分类</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visible.map((a, i) => {
            const catInfo = CAT_MAP[a.category] || CAT_MAP.thinking;
            return (
              <div key={a.id} className="card-enter" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                <Link
                  href={`/insights/${a.slug}`}
                  className="group relative bg-cream border-2 border-ink rounded-2xl p-7 shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition-all flex flex-col min-h-[260px]"
                >
                  <span className="absolute top-5 right-6 font-serif text-4xl font-black text-bg-alt leading-none">
                    {String(i + (showFeatured ? 2 : 1)).padStart(2, '0')}
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
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function CatChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-2 border-2 rounded-full text-sm font-bold shadow-brutal-sm transition ${
        active ? 'bg-ink text-background border-ink' : 'bg-cream border-ink hover:-translate-y-0.5'
      }`}
    >
      {label}
    </button>
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
        <Link href={`/insights/${article.slug}`} className="press inline-flex items-center gap-2 bg-coral text-white border-2 border-ink px-5 py-2.5 rounded-lg font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition">
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
