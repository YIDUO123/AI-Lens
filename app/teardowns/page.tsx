import Link from 'next/link';
import { Suspense } from 'react';
import { getAllDailyPicks, getAllModels, getPublishedTeardowns } from '@/lib/db/queries';
import { DailyPicksSection } from '@/components/teardowns/daily-picks-section';
import { ModelComparison } from '@/components/teardowns/model-comparison';
import { CollapsibleSection } from '@/components/teardowns/collapsible-section';

export const revalidate = 60;

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

  const [picks, models, teardowns] = await Promise.all([
    getAllDailyPicks(30),
    getAllModels(),
    getPublishedTeardowns(30),
  ]);

  return (
    <>
      <section className="container">
        <div className="border-b-2 border-ink py-15 pb-10 pt-15 mb-10">
          <span className="inline-block bg-ink text-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest rounded mb-4">
            Deep teardown · 每日刷新
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] mb-4">
            产品 <em className="accent">拆解与对比</em>
          </h1>
          <p className="max-w-3xl text-ink-soft leading-relaxed">
            像投研报告一样看 AI 产品:实时对比主流模型的能力与价格,追踪最新发布,附 PM 视角的深度判断。
            客观数据自动更新,主观解读由人工编辑 —— 谁写的、什么时候写的,都标得清清楚楚。
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
              <NavItem href="#picks" icon="🌟" label="每日精选" count={picks.length} />
              <NavItem href="#cmp"   icon="📊" label="模型 · 对比" count={models.length} />
              <NavItem href="#library" icon="📚" label="深度拆解库" count={teardowns.length} />
            </ul>

            <div className="bg-bg-alt rounded-xl p-4 text-xs leading-relaxed text-ink-soft">
              <b className="text-ink block mb-1.5">💡 关于本页数据</b>
              每日精选从 HackerNews / Product Hunt 自动抓取,补充 6 维分析在 admin 后台。<br />
              模型参数来自 OpenRouter,每 6 小时刷新。<br />
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
                <DailyPicksSection picks={picks} activeCat={picksCat} />
              </Suspense>
            </CollapsibleSection>

            {/* ============ Section 2 · 模型对比 ============ */}
            <CollapsibleSection
              id="cmp"
              storageKey="cmp"
              head={
                <SectionHead
                  kicker="Live comparison · 实时对比"
                  title={<>AI 模型 <em className="accent">能力对比</em></>}
                  right={<><LiveTag /> 价格 / 上下文长度实时更新<br /><span className="text-muted-foreground text-xs">数据更新于 {formatRelative(models[0]?.fetchedAt)}</span></>}
                />
              }
            >
              <Suspense fallback={<CmpSkeleton />}>
                <ModelComparison models={models} />
              </Suspense>

              {/* PM 结论 */}
              <div className="mt-2 bg-ink text-background rounded-2xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.2),transparent_70%)] pointer-events-none" />
                <h4 className="text-xs font-black tracking-[2px] text-coral mb-2.5">🎯 PM 结论</h4>
                <p className="text-sm leading-relaxed text-white/80 relative">
                  <strong className="text-white">2026 上半年的头部模型格局:三分天下但阵型不同。</strong>
                  OpenAI 用"分层价格"覆盖开发者市场;Anthropic 用"更长上下文 + 更细粒度控制"打专业场景;
                  Google 用"极低边际成本"抢新兴市场用户。<br /><br />
                  <strong className="text-white">选型三条经验法则:</strong>
                  (1) 需要 200 页以上文档理解 → Claude 4.5+ 或 Gemini 2.5 Pro;
                  (2) 追求极致性价比 → Gemini 2.5 Flash Lite;
                  (3) 复杂推理 + 工具调用 → GPT-5 Pro 或 Claude Opus 4.8。
                </p>
                <div className="mt-3 pt-3 border-t border-dashed border-white/20 text-[11px] italic font-serif text-white/40">
                  — AI Lens 编辑部 · 2026.07 更新
                </div>
              </div>
            </CollapsibleSection>

            {/* ============ Section 3 · 深度拆解库 ============ */}
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

              <TeardownGrid teardowns={teardowns} activeCat={libCat} />
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

function NavItem({ href, icon, label, count }: { href: string; icon: string; label: string; count: number }) {
  return (
    <li>
      <a
        href={href}
        className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold text-ink-soft hover:bg-bg-alt hover:text-ink transition border-l-[3px] border-l-transparent hover:border-l-coral"
      >
        <span>{icon} {label}</span>
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

function TeardownGrid({ teardowns, activeCat }: { teardowns: any[]; activeCat: string }) {
  const filtered = teardowns.filter((t) => {
    if (activeCat === 'all') return true;
    if (activeCat === 'domestic') return t.isDomestic;
    return t.category === activeCat;
  });

  if (filtered.length === 0) {
    return <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-line rounded-xl">该分类下暂无拆解</div>;
  }

  const catLabelMap: Record<string, string> = {
    chat: '💬 对话', coding: '💻 编码', creative: '🎨 AIGC', enterprise: '🏢 企业级',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {filtered.map((t, i) => (
        <Link
          key={t.id}
          href={`/teardowns/${t.slug}`}
          className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition flex flex-col min-h-[280px]"
        >
          <div className="font-serif text-3xl font-black text-bg-alt leading-none mb-3">
            {String(i + 1).padStart(2, '0')}
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
      ))}
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

function CmpSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 rounded-2xl bg-cream border-2 border-ink/10 animate-pulse" />
      <div className="h-96 rounded-2xl bg-cream border-2 border-ink/10 animate-pulse" />
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  return `${Math.round(diffMin / 60)} 小时前`;
}
