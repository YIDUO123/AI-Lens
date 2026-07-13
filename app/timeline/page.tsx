import Link from 'next/link';
import { getFamilyTimeline, getFamilyCounts } from '@/lib/db/queries';
import { Suspense } from 'react';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const revalidate = 300; // 5 分钟 · 你内容不是分钟级更新的

type SP = { fam?: string };

const FAMILIES: { key: string; icon: string; label: string; tagline: string; lead: string }[] = [
  { key: 'openai', icon: '🤖', label: 'OpenAI', tagline: '通用 AI 的定义者与破局者',
    lead: '从 GPT-3 到 GPT-5.5,OpenAI 用"更强 + 更通用"的路线定义了消费级 AI。2026 年通过分层价格线(nano/mini/pro)和 Codex 独立品牌,把通用与专业分开打。' },
  { key: 'anthropic', icon: '🧠', label: 'Anthropic Claude', tagline: '专业向标杆 · 从 alignment 起家',
    lead: 'Anthropic 用"Constitutional AI + 长上下文 + Computer Use"三张牌,把 Claude 打造成专业场景的默认选择。2026 年 Opus 4.8 + MCP 生态让它在企业市场领跑。' },
  { key: 'google', icon: '🔷', label: 'Google Gemini', tagline: '大厂反攻 · 从落后到并肩',
    lead: 'Google 用了两年时间从"Bard 被吐槽"到"Gemini 2.5 Pro 挑战头部"。核心策略:百万上下文 + 极低边际成本 + 全模态。' },
  { key: 'cursor', icon: '⚡', label: 'Cursor', tagline: 'AI 编码 IDE · 独立开发者的胜利',
    lead: 'Cursor 从 VS Code fork 起步,3 年内成为 AI 编码工具事实标准。核心策略:先做好"补全 → 重构 → agent"的完整体验闭环。' },
  { key: 'domestic', icon: '🇨🇳', label: '国内梯队', tagline: '追平 → 差异化 → 局部领先',
    lead: '2023 追平, 2024 差异化, 2025 局部领先。DeepSeek 走推理性价比, Qwen 走开源生态, 豆包走消费级闭环, Kimi 走长上下文推理。' },
];

const FAM_COLORS: Record<string, string> = {
  openai: '#10a37f', anthropic: '#C15F3C', google: '#4285F4', cursor: '#1a1a1a', domestic: '#DE2910',
};

export default async function TimelinePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const activeFam = sp.fam || 'openai';
  const counts = await getFamilyCounts();

  return (
    <>
      <section className="container">
        <div className="border-b-2 border-ink py-15 pb-10 pt-15 mb-10">
          <span className="inline-block bg-ink text-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest rounded mb-4">
            Evolution timeline · 从最新到起点
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] mb-4">
            AI 模型 <em className="accent">代际演化</em>
          </h1>
          <p className="max-w-2xl text-ink-soft leading-relaxed">
            不追单次版本,追每个 AI 家族的完整弧线。
            OpenAI、Anthropic、Google、Cursor、国内梯队 —— 五条独立时间轴,从今天倒着讲到起点。
            突破性版本用金色星标出,行业信号与关键能力分开呈现。
          </p>
          <p className="mt-3 text-xs text-muted-foreground italic">
            由 AI Lens 编辑手工维护 · 每周补入新版本(自动抓取时间线正在开发中)· 有遗漏欢迎<a href="/about" className="text-coral font-bold hover:underline">联系告知</a>。
          </p>
        </div>
      </section>

      <div className="container pb-20">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* 左侧栏 */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              家族切换
              <span className="flex-1 h-px bg-line" />
            </div>
            <ul className="space-y-1 mb-6">
              {FAMILIES.map((f) => {
                const isActive = f.key === activeFam;
                const count = counts[f.key] || 0;
                return (
                  <li key={f.key}>
                    <Link
                      href={`/timeline?fam=${f.key}`}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                        isActive ? 'bg-ink text-background border-l-[3px] border-l-coral' : 'text-ink-soft hover:bg-bg-alt hover:text-ink border-l-[3px] border-l-transparent'
                      }`}
                    >
                      <span>{f.icon} {f.label}</span>
                      <span className={`font-mono text-[11px] ${isActive ? 'text-white/55' : 'text-muted-foreground'}`}>{count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="bg-bg-alt rounded-xl p-4 text-xs leading-relaxed text-ink-soft">
              <b className="text-ink block mb-1.5">💡 关于本页数据</b>
              每个家族的版本演化由本站编辑手工整理,顺序为 <b className="text-ink">最新→起点</b>,突破性版本用金色星标出。<br /><br />
              想看每周的最新发布? 去 <Link href="/news?tab=releases" className="text-coral font-bold underline">AI 资讯 · 家族动态</Link>。
            </div>
          </aside>

          {/* 主区 */}
          <main className="min-w-0">
            {/* 家族 tab bar */}
            <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border-2 border-ink bg-cream p-1.5 shadow-brutal-sm">
              {FAMILIES.map((f) => {
                const isActive = f.key === activeFam;
                const count = counts[f.key] || 0;
                return (
                  <Link
                    key={f.key}
                    href={`/timeline?fam=${f.key}`}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-bold transition ${
                      isActive ? 'bg-ink text-background' : 'text-ink-soft hover:bg-bg-alt'
                    }`}
                  >
                    <span>{f.icon}</span><span>{f.label}</span>
                    <small className={`text-[10px] font-normal ml-0.5 ${isActive ? 'text-white/55' : 'text-muted-foreground'}`}>{count}</small>
                  </Link>
                );
              })}
            </div>

            <Suspense fallback={<FamilySkeleton />}>
              <FamilyPanel famKey={activeFam} />
            </Suspense>
          </main>
        </div>
      </div>
    </>
  );
}

async function FamilyPanel({ famKey }: { famKey: string }) {
  const family = FAMILIES.find((f) => f.key === famKey);
  if (!family) return <div>未知家族</div>;

  const versions = await getFamilyTimeline(famKey);
  if (versions.length === 0) {
    return <div className="p-10 text-center text-muted-foreground">该家族暂无版本记录</div>;
  }

  const breakthroughs = versions.filter((v) => v.breakthrough).length;
  const latest = versions[0];
  const earliest = versions[versions.length - 1];

  return (
    <>
      {/* 家族总览 hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/60 to-amber-100 border-2 border-ink p-7 md:p-8 shadow-brutal mb-8">
        <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.12),transparent_70%)] pointer-events-none" />

        <div className="flex items-center gap-3 flex-wrap mb-2.5">
          <span className="text-2xl">{family.icon}</span>
          <h2 className="text-2xl font-black tracking-[-0.02em]">{family.label}</h2>
          <span
            className="text-white text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: FAM_COLORS[famKey] }}
          >
            {family.tagline}
          </span>
        </div>
        <p className="text-sm text-ink-soft leading-relaxed max-w-none md:max-w-4xl mb-5">{family.lead}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 rounded-lg border border-ink/10 bg-white/50 overflow-hidden">
          <FoStat num={String(versions.length)} label="代际数" />
          <FoStat num={String(breakthroughs)} label="突破点" />
          <FoStat num={latest.dateLabel} label="最新版本" small />
          <FoStat num={earliest.dateLabel} label="起源" small />
        </div>
      </div>

      {/* 垂直时间轴 */}
      <div className="relative pl-11">
        <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-ink to-line" />

        <div className="space-y-8">
          {versions.map((v, i) => (
            <TimelineItem key={v.id} v={v} isLatest={i === 0} />
          ))}
        </div>
      </div>
    </>
  );
}

function TimelineItem({ v, isLatest }: { v: any; isLatest: boolean }) {
  const classes = [
    'relative bg-cream border-2 border-ink rounded-2xl px-6 py-5 shadow-brutal-sm',
    'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition',
  ];
  if (v.breakthrough) classes.push('bg-gradient-to-br from-orange-50 to-amber-100/60');

  return (
    <div className={classes.join(' ')}>
      {/* 圆点 */}
      <div className={`absolute -left-[35px] top-5 w-4 h-4 rounded-full border-[3px] ${v.breakthrough ? 'bg-gold border-coral shadow-[0_0_0_4px_rgba(255,107,53,0.15)]' : 'bg-background border-ink'} z-10`} />

      {/* LATEST 徽 */}
      {isLatest && (
        <div className="absolute -top-2.5 right-5 bg-coral text-white text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full shadow-brutal-sm">
          LATEST
        </div>
      )}

      <div className="flex justify-between items-start flex-wrap gap-2.5 mb-2.5">
        <div className="flex items-center gap-2 text-lg font-black tracking-tight">
          {v.breakthrough && <span className="bg-gold text-ink text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase">🌟 突破</span>}
          <em className="accent not-italic font-serif italic">{v.version}</em>
        </div>
        <span className="font-mono text-xs font-bold text-coral tracking-wide bg-background px-2 py-0.5 rounded border border-line">
          {v.dateLabel}
        </span>
      </div>

      {v.title && <div className="text-sm text-ink-soft mb-3">{v.title}</div>}

      {v.changes && Array.isArray(v.changes) && v.changes.length > 0 && (
        <ul className="p-3 px-3.5 bg-bg-alt rounded-lg space-y-1 mb-3">
          {v.changes.map((c: string, i: number) => (
            <li key={i} className="text-[12.5px] text-ink-soft pl-3.5 relative leading-relaxed">
              <span className="absolute left-0 top-2 w-1 h-1 rounded-full bg-coral" />
              {c}
            </li>
          ))}
        </ul>
      )}

      {v.capability && (
        <div className="grid grid-cols-[auto_1fr] gap-3 items-baseline p-2.5 px-3.5 rounded-lg bg-teal/6 border-l-[3px] border-teal text-sm leading-relaxed">
          <span className="text-[10px] font-black tracking-widest uppercase text-teal whitespace-nowrap">🌱 关键能力</span>
          <span className="text-ink-soft">{v.capability}</span>
        </div>
      )}

      {v.signal && (
        <div className="grid grid-cols-[auto_1fr] gap-3 items-baseline p-2.5 px-3.5 rounded-lg bg-gold/10 border-l-[3px] border-gold text-sm leading-relaxed mt-2">
          <span className="text-[10px] font-black tracking-widest uppercase text-amber-700 whitespace-nowrap">🎯 行业信号</span>
          <span className="text-ink-soft">{v.signal}</span>
        </div>
      )}
    </div>
  );
}

function FoStat({ num, label, small }: { num: string; label: string; small?: boolean }) {
  return (
    <div className="p-3 text-center border-r border-ink/8 last:border-r-0">
      <div className={`font-serif font-black text-coral leading-none mb-1 ${small ? 'text-base pt-1' : 'text-2xl'}`}>{num}</div>
      <div className="text-[10px] text-ink-soft">{label}</div>
    </div>
  );
}

function FamilySkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-56 rounded-2xl bg-cream border-2 border-ink/20 animate-pulse" />
      <div className="pl-11 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-cream border-2 border-ink/10 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
