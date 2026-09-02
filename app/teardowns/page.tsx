import Link from 'next/link';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { Sparkles, LibraryBig, Lightbulb } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getAllDailyPicks, getPublishedTeardowns, getInteractionCountsBatch, getUserInteractions } from '@/lib/db/queries';
import { DailyPicksSection } from '@/components/teardowns/daily-picks-section';
import { CollapsibleSection } from '@/components/teardowns/collapsible-section';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const revalidate = 300; // 5 分钟 · 你内容不是分钟级更新的

type SP = { picks?: string; lib?: string };

const LIB_CATS: { key: string; label: string; domesticOnly?: boolean }[] = [
  { key: 'all', label: '全部' },
  { key: 'chat', label: '💬 对话' },
  { key: 'coding', label: '💻 编码' },
  { key: 'creative', label: '🎨 AIGC 创作' },
  { key: 'enterprise', label: '🏢 企业级' },
  { key: 'domestic', label: '🇨🇳 国内', domesticOnly: true },
];

export default async function TeardownsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const picksCat = sp.picks || 'all';
  const libCat = sp.lib || 'all';

  const [picks, teardowns, session] = await Promise.all([
    getAllDailyPicks(12),
    getPublishedTeardowns(30),
    auth.api.getSession({ headers: await headers() }),
  ]);
  const currentUserId = session?.user?.id || null;

  // 批量查赞/藏数(所有 picks + teardowns 都要)
  const pickIds = picks.map((p) => p.id);
  const teardownIds = teardowns.map((t) => t.id);
  const [pickCounts, teardownCounts, pickUserState, teardownUserState] = await Promise.all([
    getInteractionCountsBatch('daily_pick', pickIds),
    getInteractionCountsBatch('teardown', teardownIds),
    currentUserId ? getUserInteractions(currentUserId, 'daily_pick', pickIds) : Promise.resolve({ likedIds: new Set<string>(), savedIds: new Set<string>() }),
    currentUserId ? getUserInteractions(currentUserId, 'teardown', teardownIds) : Promise.resolve({ likedIds: new Set<string>(), savedIds: new Set<string>() }),
  ]);

  return (
    <>
      <section className="container">
        <div className="border-b-2 border-ink pt-12 pb-10 mb-10">
          <span className="inline-block bg-ink text-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest rounded mb-4">
            Deep teardown · 每日刷新
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] mb-4">
            产品 <em className="accent">拆解</em>
          </h1>
          <p className="max-w-3xl text-ink-soft leading-relaxed">
            像投研报告一样看 AI 产品:每日创投精选自动追踪最新发布,深度拆解库附 PM 视角的六维判断。
            客观数据自动更新,主观解读由人工编辑 —— 谁写的、什么时候写的,都标得清清楚楚。
            想看模型能力对比,去 <Link href="/timeline#cmp" className="text-coral font-bold hover:underline">模型追踪</Link>。
          </p>
        </div>
      </section>

      <div className="container pb-20">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* 左侧栏 */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              分析模块
              <span className="flex-1 h-px bg-line" />
            </div>
            <ul className="space-y-1 mb-8">
              <NavItem href="#picks" icon={<Sparkles className="w-4 h-4" />} label="每日精选" count={picks.length} />
              <NavItem href="#library" icon={<LibraryBig className="w-4 h-4" />} label="深度拆解库" count={teardowns.length} />
            </ul>

            <div className="bg-bg-alt rounded-xl p-4 text-xs leading-relaxed text-ink-soft">
              <b className="text-ink inline-flex items-center gap-1.5 mb-1.5"><Lightbulb className="w-3.5 h-3.5" /> 关于本页数据</b>
              每日精选从 HackerNews / Product Hunt 自动抓取,补充 6 维分析在 admin 后台。<br />
              能力评级、"编辑观点"由 AI Lens 编辑撰写。
            </div>
          </aside>

          <main className="min-w-0">
            {/* ============ Section 1 · 每日精选 ============ */}
            <CollapsibleSection
              id="picks"
              storageKey="picks"
              head={
                <SectionHead
                  kicker="Daily VC picks · 创投日报"
                  title={<>每日创投产品 <em className="accent">灵感速递</em></>}
                  right={<><LiveTag /> 来自 Product Hunt · Hacker News<br /><span className="text-muted-foreground text-xs">北美创投圈日更新品(不限 AI)</span></>}
                />
              }
            >
              <Suspense fallback={<PicksSkeleton />}>
                <DailyPicksSection
                  picks={picks}
                  activeCat={picksCat}
                  currentUserId={currentUserId}
                  likeCounts={pickCounts.likes}
                  saveCounts={pickCounts.saves}
                  userLikedIds={Array.from(pickUserState.likedIds)}
                  userSavedIds={Array.from(pickUserState.savedIds)}
                />
              </Suspense>
            </CollapsibleSection>

            {/* ============ Section 2 · 深度拆解库 ============ */}
            <CollapsibleSection
              id="library"
              storageKey="library"
              head={
                <SectionHead
                  kicker="Deep library · 编辑手写"
                  title={<>深度 <em className="accent">拆解库</em></>}
                  right={<>由 AI Lens 编辑部撰写<br /><span className="text-muted-foreground text-xs">不定期更新 · 支持在 admin 里追加</span></>}
                />
              }
            >
              <div className="flex flex-wrap gap-2 mb-6">
                {LIB_CATS.map((c) => (
                  <Link
                    key={c.key}
                    href={`/teardowns?lib=${c.key}#library`}
                    scroll={false}
                    className={`px-3.5 py-1.5 border rounded-full text-sm font-semibold transition ${
                      libCat === c.key
                        ? 'bg-ink text-background border-ink'
                        : 'bg-cream border-line hover:border-ink'
                    }`}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>

              <TeardownGrid
                teardowns={teardowns}
                activeCat={libCat}
                currentUserId={currentUserId}
                likeCounts={teardownCounts.likes}
                saveCounts={teardownCounts.saves}
                userLikedIds={Array.from(teardownUserState.likedIds)}
                userSavedIds={Array.from(teardownUserState.savedIds)}
              />
            </CollapsibleSection>

          </main>
        </div>
      </div>
    </>
  );
}

// ============================================================
// 辅助组件
// ============================================================

function NavItem({ href, icon, label, count }: { href: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <li>
      <a
        href={href}
        className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold text-ink-soft hover:bg-bg-alt hover:text-ink transition border-l-[3px] border-l-transparent hover:border-l-coral"
      >
        <span className="flex items-center gap-2">{icon} {label}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{count}</span>
      </a>
    </li>
  );
}

function SectionHead({ kicker, title, right }: { kicker: string; title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-end flex-wrap gap-3.5 mb-5 pb-3.5 border-b-2 border-dashed border-line">
      <div>
        <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-1">{kicker}</div>
        <h2 className="text-3xl font-black tracking-[-0.02em] leading-tight">{title}</h2>
      </div>
      {right && <div className="text-right text-xs text-muted-foreground leading-relaxed max-w-[300px]">{right}</div>}
    </div>
  );
}

function LiveTag() {
  return (
    <span className="inline-flex items-center gap-1 bg-ink text-background text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded mr-2">
      <span className="inline-block h-1 w-1 rounded-full bg-green-400 animate-pulse-dot" />
      LIVE
    </span>
  );
}

function TeardownGrid({
  teardowns, activeCat, likeCounts, saveCounts,
}: {
  teardowns: any[];
  activeCat: string;
  currentUserId: string | null;
  likeCounts: Record<string, number>;
  saveCounts: Record<string, number>;
  userLikedIds: string[];
  userSavedIds: string[];
}) {
  const filtered = teardowns.filter((t) => {
    if (activeCat === 'all') return true;
    if (activeCat === 'domestic') return t.isDomestic;
    return t.category === activeCat;
  });

  // 按赞数降序 + 时间保底
  const sorted = [...filtered].sort((a, b) => {
    const diff = (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0);
    if (diff !== 0) return diff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  if (sorted.length === 0) {
    return <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-line rounded-xl">该分类下暂无拆解</div>;
  }

  const catLabelMap: Record<string, string> = {
    chat: '💬 对话', coding: '💻 编码', creative: '🎨 AIGC', enterprise: '🏢 企业级',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {sorted.map((t, i) => {
        const likes = likeCounts[t.id] || 0;
        const saves = saveCounts[t.id] || 0;
        return (
          <Link
            key={t.id}
            href={`/teardowns/${t.slug}`}
            className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition flex flex-col min-h-[280px]"
          >
            <div className="flex items-baseline justify-between mb-3">
              <div className="font-serif text-3xl font-black text-bg-alt leading-none">
                {String(i + 1).padStart(2, '0')}
              </div>
              {(likes > 0 || saves > 0) && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  {likes > 0 && <span>❤️ {likes}</span>}
                  {saves > 0 && <span>⭐ {saves}</span>}
                </div>
              )}
            </div>
            <div className="inline-block self-start px-2 py-1 text-[10px] font-black tracking-widest uppercase bg-bg-alt text-ink rounded mb-3">
              {t.isDomestic ? '🇨🇳 国内 · ' : ''}{catLabelMap[t.category] || t.category}
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 leading-snug">
              <em className="accent">{t.title.split(' · ')[0]}</em>{t.title.includes(' · ') ? ' · ' + t.title.split(' · ').slice(1).join(' · ') : ''}
            </h3>
            <p className="text-sm text-ink-soft leading-relaxed flex-1 mb-3">{t.positioning}</p>
            <div className="mt-auto pt-3 border-t border-dashed border-line flex justify-between items-center text-[11px] text-muted-foreground">
              <span>{formatDate(t.publishedAt)} · {t.readTime} 分钟</span>
              <span className="font-bold text-ink">读拆解 →</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function PicksSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-52 rounded-2xl bg-cream border-2 border-ink/10 animate-pulse" />
      ))}
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
