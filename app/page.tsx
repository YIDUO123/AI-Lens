import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getLatestNews,
  getNewsCount,
  getPublishedTeardowns,
  getPublishedArticles,
  getFamilyCounts,
} from '@/lib/db/queries';
import { LiveNewsFeed } from '@/components/home/live-news-feed';
import { NewsletterForm } from '@/components/newsletter-form';

export const revalidate = 300; // 5 分钟 · 你内容不是分钟级更新的

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<AnnoBarSkeleton />}>
        <AnnoBar />
      </Suspense>

      {/* Hero · 带简约点阵底纹 */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        {/* 底纹层:极淡的点阵 + 右上珊瑚光晕 */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(circle, #1a1a1a 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 40%, transparent 100%)',
          }}
        />
        <div className="absolute -top-20 right-[8%] w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.12),transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[15%] left-[5%] w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(47,111,235,0.08),transparent_70%)] pointer-events-none" />

        <div className="container relative">
          <div className="grid items-center gap-12 lg:gap-16 lg:grid-cols-[1.05fr_1fr] max-w-6xl mx-auto">
          <div>
            <Badge variant="soft" className="mb-6 gap-1.5 rounded-full px-3.5 py-1.5">
              <span className="rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-black text-white">v2.0</span>
              <span className="text-xs">尝试看清 AI 产品的实质</span>
            </Badge>

            <h1 className="mb-6 text-6xl font-black leading-[0.98] tracking-[-0.06em] md:text-7xl">
              看得<span className="font-serif italic text-blue-600">多</span>
              <br />
              不如看得<em className="accent">懂</em>。
            </h1>

            <p className="mb-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              AI 每天有 200+ 条新动态,90% 是噪声。AI Lens 从全球公开信息源持续过滤、结构化、二次分析,
              输出真正值得读的信号。
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="coral" size="lg" asChild>
                <Link href="/news">🔥 今日精选动态</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/teardowns">📖 浏览产品拆解</Link>
              </Button>
            </div>
          </div>

          {/* 动态镜头(客户端组件 · 有动画)*/}
          <div className="relative">
            <Suspense fallback={<LensSkeleton />}>
              <LensMockup />
            </Suspense>
          </div>
          </div>
        </div>
      </section>

      {/* Stats strip · 精致版 */}
      <section className="container">
        <Suspense fallback={<StatsSkeleton />}>
          <StatsStrip />
        </Suspense>
      </section>

      {/* 4 大模块入口 */}
      <section className="container my-20 md:my-24">
        <div className="flex justify-between items-end flex-wrap gap-4 pb-5 mb-10 border-b-2 border-dashed border-line">
          <div>
            <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-1">Four lenses · 四个观察角度</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-[-0.02em] leading-tight">从<em className="accent">信号</em>到<em className="accent">判断</em>,分四步。</h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm text-right leading-relaxed">
            资讯是数据,拆解是结构,追踪是节奏,洞察是判断 —— 每一层比上一层多一份主观。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Suspense fallback={<ModulesFallback />}>
            <ModuleCardsWithCounts />
          </Suspense>
        </div>
      </section>

      {/* Newsletter · 首页底部订阅 */}
      <section className="container my-16 md:my-20">
        <NewsletterForm source="home" />
      </section>
    </>
  );
}

// ============================================================
// Announcement bar
// ============================================================
async function AnnoBar() {
  const [latest] = await getLatestNews(1);
  const count = await getNewsCount();
  const lastFetched = latest?.fetchedAt ? formatRelative(latest.fetchedAt) : '待抓取';
  return (
    <div className="border-b border-secondary bg-ink py-2.5 text-center text-xs text-background">
      <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-green-400" />
      数据管道运行中 · 最新一次抓取 · <b className="text-coral">{lastFetched}</b> · 已收录 <b className="text-coral">{count || '—'}</b> 条 AI 动态
    </div>
  );
}
function AnnoBarSkeleton() {
  return <div className="border-b border-secondary bg-ink py-2.5 text-center text-xs text-white/40">载入数据…</div>;
}

// ============================================================
// Lens mockup(动态 · 从 DB 取数据交给 client 组件)
// ============================================================
async function LensMockup() {
  const latest = await getLatestNews(8);
  return <LiveNewsFeed items={latest} />;
}
function LensSkeleton() {
  return <div className="aspect-square rounded-3xl bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-ink shadow-brutal animate-pulse" />;
}

// ============================================================
// Stats strip · 更精致的版本
// ============================================================
async function StatsStrip() {
  const [count, teardowns, articles, famCounts] = await Promise.all([
    getNewsCount(),
    getPublishedTeardowns(50),
    getPublishedArticles(50),
    getFamilyCounts(),
  ]);
  const timelineTotal = Object.values(famCounts).reduce((a: number, b: any) => a + Number(b), 0);

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard num={String(count || 0) + '+'}  label="追踪的 AI 动态"  sub="self-updating"    accent="coral" />
      <StatCard num={String(teardowns.length)}  label="深度产品拆解"    sub="human-curated"   accent="teal" />
      <StatCard num={String(timelineTotal || 0)}label="模型代际记录"    sub="5 家族横向对比"    accent="gold" />
      <StatCard num={String(articles.length)}   label="深度洞察长文"    sub="original writing" accent="ink" />
    </div>
  );
}
function StatsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
      {[0,1,2,3].map((i) => <div key={i} className="h-32 bg-cream border-2 border-ink/10 rounded-2xl animate-pulse" />)}
    </div>
  );
}

// ============================================================
// 4 大模块 · 动态取真实数量
// ============================================================
async function ModuleCardsWithCounts() {
  const [count, teardowns, articles, famCounts] = await Promise.all([
    getNewsCount(),
    getPublishedTeardowns(200),
    getPublishedArticles(200),
    getFamilyCounts(),
  ]);
  const timelineTotal = Object.values(famCounts).reduce((a: number, b: any) => a + Number(b), 0);

  return (
    <>
      <ModuleCard num="01" icon="📰" title="每日 AI 资讯" desc="覆盖模型 · 产品 · 行业 · 论文 · 技巧五类。全球公开信源持续聚合,每 30 分钟自动刷新。" href="/news" cta={`${count || '—'}+ 条`} iconBg="bg-coral" />
      <ModuleCard num="02" icon="🔍" title="深度产品拆解" desc="像投研报告一样看 AI 产品:定位、用户、模式、亮点、争议。附同类产品横评。" href="/teardowns" cta={`${teardowns.length} 篇拆解`} iconBg="bg-teal" />
      <ModuleCard num="03" icon="🔄" title="模型代际演化" desc="不追单次版本,追每个 AI 家族的完整弧线 —— OpenAI、Anthropic、Google、Cursor、国内梯队五条时间轴。" href="/timeline" cta={`${timelineTotal || '—'} 代模型`} iconBg="bg-gold text-ink" />
      <ModuleCard num="04" icon="✍️" title="独立洞察专栏" desc="行业思考 · 上手体验 · 方法论。不只是 AI 产品,也谈 PM 如何在 AI 时代重新定义自己。" href="/insights" cta={`${articles.length} 篇长文`} iconBg="bg-ink text-background" />
    </>
  );
}

function ModulesFallback() {
  return (
    <>
      {[0,1,2,3].map((i) => (
        <div key={i} className="h-[300px] bg-cream border-2 border-ink/10 rounded-[18px] animate-pulse" />
      ))}
    </>
  );
}

function StatCard({ num, label, sub, accent }: { num: string; label: string; sub: string; accent: 'coral' | 'teal' | 'gold' | 'ink' }) {
  const accentClass = {
    coral: 'text-coral',
    teal: 'text-teal',
    gold: 'text-amber-700',
    ink: 'text-ink',
  }[accent];
  return (
    <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition">
      <div className={`font-serif text-4xl md:text-5xl font-black leading-none mb-2 ${accentClass}`}>{num}</div>
      <div className="text-sm font-semibold text-ink mb-0.5">{label}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">// {sub}</div>
    </div>
  );
}

// ============================================================
// Module card
// ============================================================
function ModuleCard({ num, icon, title, desc, href, cta, iconBg }: {
  num: string; icon: string; title: string; desc: string; href: string; cta: string; iconBg: string;
}) {
  return (
    <Link href={href} className="group relative bg-cream border-2 border-ink rounded-[18px] p-6 shadow-brutal-sm hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal transition-all flex flex-col min-h-[300px] overflow-hidden">
      <span className="absolute top-3 right-4 font-serif text-[80px] font-black text-bg-alt leading-none pointer-events-none">{num}</span>

      <div className={`relative w-11 h-11 border-2 border-ink rounded-xl grid place-items-center text-xl mb-5 ${iconBg}`}>
        {icon}
      </div>

      <h3 className="relative text-xl font-bold tracking-tight mb-1.5">{title}</h3>
      <p className="relative text-[13.5px] text-ink-soft leading-relaxed flex-1 mb-4">{desc}</p>

      <div className="relative flex justify-between items-center pt-3.5 border-t border-dashed border-line">
        <span className="text-[11px] text-muted-foreground">
          <b className="font-serif font-black text-ink text-base mr-0.5">{cta.split(' ')[0]}</b> {cta.split(' ').slice(1).join(' ')}
        </span>
        <div className="w-7 h-7 rounded-full bg-ink text-background grid place-items-center font-bold group-hover:translate-x-1 group-hover:bg-coral transition">→</div>
      </div>
    </Link>
  );
}

function formatRelative(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.round(h / 24)} 天前`;
}
