import Link from 'next/link';
import { searchAll } from '@/lib/db/queries';
import { Search, FileText, BookOpen, Rocket, Newspaper } from 'lucide-react';
import { logEvent, hashString } from '@/lib/analytics/log';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const dynamic = 'force-dynamic';
export const metadata = { title: '搜索', description: '搜索 AI Lens 全站内容' };

type SP = { q?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const results = q ? await searchAll(q) : null;

  // 埋点 · 服务端 · fire-and-forget
  if (q) {
    const totalResults = results?.total ?? 0;
    logEvent('search_submit', {
      query_hash: hashString(q),
      query_length: q.length,
      result_count: totalResults,
      is_empty: totalResults === 0,
    }, { path: '/search' });
  }

  return (
    <div className="container max-w-4xl py-10 pb-24">
      {/* Search hero */}
      <div className="mb-10">
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Search · 全站搜索</div>
        <h1 className="text-4xl font-black tracking-[-0.03em] leading-tight mb-6">
          找到你要看的<em className="accent">那一条</em>
        </h1>

        <form action="/search" method="GET" className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="搜产品名 · 关键词 · 作者名…"
            autoFocus
            className="w-full pl-12 pr-4 py-3.5 bg-cream border-2 border-ink rounded-xl text-base focus:outline-none focus:shadow-brutal-sm"
          />
        </form>
        {q && results && (
          <div className="mt-3 text-sm text-muted-foreground">
            找到 <b className="text-coral font-serif text-base font-black">{results.total}</b> 条结果 · 搜"<span className="text-ink font-semibold">{q}</span>"
          </div>
        )}
      </div>

      {!q && (
        <div className="text-center py-16 bg-bg-alt/50 border-2 border-dashed border-line rounded-2xl">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">输入关键词开始搜索 · 覆盖 AI 资讯 · 每日精选 · 拆解 · 洞察长文</p>
        </div>
      )}

      {q && results && results.total === 0 && (
        <div className="text-center py-16 bg-bg-alt/50 border-2 border-dashed border-line rounded-2xl">
          <p className="text-lg font-bold mb-1">未找到"<span className="text-coral">{q}</span>"相关内容</p>
          <p className="text-sm text-muted-foreground">试试换个关键词 · 或看看 <Link href="/news" className="underline text-coral font-bold">今日资讯</Link></p>
        </div>
      )}

      {q && results && results.total > 0 && (
        <div className="space-y-10">
          {results.articles.length > 0 && (
            <ResultSection icon={<FileText className="w-4 h-4" />} title="洞察长文" count={results.articles.length}>
              {results.articles.map((a: any) => (
                <Link key={a.id} href={`/insights/${a.slug}`} className="block bg-cream border-2 border-ink rounded-xl p-5 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition">
                  <div className="flex items-baseline justify-between mb-1.5 gap-3">
                    <h3 className="font-bold text-base leading-snug">{highlightMatch(a.title, q)}</h3>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex-shrink-0">{a.category}</span>
                  </div>
                  {a.excerpt && <p className="text-sm text-ink-soft line-clamp-2">{highlightMatch(a.excerpt, q)}</p>}
                </Link>
              ))}
            </ResultSection>
          )}

          {results.teardowns.length > 0 && (
            <ResultSection icon={<BookOpen className="w-4 h-4" />} title="产品拆解" count={results.teardowns.length}>
              {results.teardowns.map((t: any) => (
                <Link key={t.id} href={`/teardowns/${t.slug}`} className="block bg-cream border-2 border-ink rounded-xl p-5 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition">
                  <div className="flex items-baseline justify-between mb-1.5 gap-3">
                    <h3 className="font-bold text-base leading-snug">{highlightMatch(t.title, q)}</h3>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex-shrink-0">{t.category}</span>
                  </div>
                  {t.positioning && <p className="text-sm text-ink-soft line-clamp-2">{highlightMatch(t.positioning, q)}</p>}
                </Link>
              ))}
            </ResultSection>
          )}

          {results.daily_picks.length > 0 && (
            <ResultSection icon={<Rocket className="w-4 h-4" />} title="每日创投精选" count={results.daily_picks.length}>
              {results.daily_picks.map((p: any) => (
                <a key={p.id} href={p.url || '#'} target="_blank" rel="noopener noreferrer" className="block bg-cream border-2 border-ink rounded-xl p-5 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg grid place-items-center text-white text-lg flex-shrink-0" style={{ background: p.logoColor || '#1a1a1a' }}>{p.logo || '🚀'}</div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base mb-1">{highlightMatch(p.name, q)}</h3>
                      <p className="text-sm text-ink-soft line-clamp-2">{highlightMatch(p.tagline, q)}</p>
                    </div>
                  </div>
                </a>
              ))}
            </ResultSection>
          )}

          {results.news_items.length > 0 && (
            <ResultSection icon={<Newspaper className="w-4 h-4" />} title="AI 资讯" count={results.news_items.length}>
              {results.news_items.map((n: any) => (
                <a key={n.id} href={n.url || '#'} target="_blank" rel="noopener noreferrer" className="block bg-cream border-2 border-ink rounded-xl p-4 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition">
                  <h3 className="font-bold text-sm mb-1 leading-snug">{highlightMatch(n.title, q)}</h3>
                  <div className="text-[11px] text-muted-foreground">{formatDate(n.publishedAt)} · {n.source}</div>
                </a>
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-coral">{icon}</span>
        <h2 className="text-lg font-black">{title}</h2>
        <span className="text-sm font-mono bg-bg-alt px-2 py-0.5 rounded text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function highlightMatch(text: string | null, q: string): React.ReactNode {
  if (!text || !q) return text || '';
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase()
      ? <mark key={i} className="bg-coral/25 text-ink font-bold px-0.5 rounded">{p}</mark>
      : p
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
