import Link from 'next/link';
import { getFamilyTimeline, getFamilyCounts, getAllModels } from '@/lib/db/queries';
import { ModelComparison } from '@/components/teardowns/model-comparison';
import { FamilyTimeline } from '@/components/timeline/family-timeline';
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
  const activeFam = FAMILIES.some((f) => f.key === sp.fam) ? sp.fam! : 'openai';

  const [counts, models, ...familyTimelines] = await Promise.all([
    getFamilyCounts(),
    getAllModels(),
    ...FAMILIES.map((f) => getFamilyTimeline(f.key)),
  ]);
  const timelines: Record<string, any[]> = Object.fromEntries(FAMILIES.map((f, i) => [f.key, familyTimelines[i]]));

  return (
    <>
      <section className="container">
        <div className="border-b-2 border-ink pt-12 pb-10 mb-10">
          <span className="inline-block bg-ink text-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest rounded mb-4">
            Evolution timeline · 从最新到起点
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05] mb-4">
            AI 模型 <em className="accent">对比与演化</em>
          </h1>
          <p className="max-w-2xl text-ink-soft leading-relaxed">
            一页看清 AI 模型:先横向对比主流模型的能力与价格,再纵向追踪每个家族的完整代际弧线。
            OpenAI、Anthropic、Google、Cursor、国内梯队 —— 客观数据自动更新,主观解读由人工编辑。
          </p>
          <p className="mt-3 text-xs text-muted-foreground italic">
            能力/价格数据每日自动抓取 · 版本条目由自动检测补充 + 编辑审核修订 · 有遗漏欢迎<a href="/about" className="text-coral font-bold hover:underline">联系告知</a>。
          </p>
        </div>
      </section>

      <div className="container pb-20">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* 左侧栏 · 仅桌面端(移动端用页内 tab,避免冗余) */}
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            <div className="bg-bg-alt rounded-xl p-4 text-xs leading-relaxed text-ink-soft">
              <b className="text-ink block mb-1.5">💡 关于本页数据</b>
              能力/价格来自 OpenRouter 每日同步;版本时间线由新闻自动检测补充,编辑审核修订。
            </div>
          </aside>

          <main className="min-w-0">
            {/* ============ Section 1 · 能力/价格对比 ============ */}
            <section id="cmp" className="mb-14">
              <div className="flex justify-between items-end flex-wrap gap-4 mb-6 pb-3 border-b-2 border-dashed border-line">
                <div>
                  <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-1">Live comparison · 实时对比</div>
                  <h2 className="text-3xl font-black tracking-[-0.02em] leading-tight">AI 模型 <em className="accent">能力对比</em></h2>
                </div>
                <div className="text-right text-xs text-muted-foreground leading-relaxed max-w-[300px]">
                  <span className="inline-flex items-center gap-1 bg-ink text-background text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded mr-2">
                    <span className="inline-block h-1 w-1 rounded-full bg-green-400 animate-pulse-dot" />LIVE
                  </span>
                  价格 / 上下文实时更新<br />
                  <span>数据更新于 {formatRelative(models[0]?.fetchedAt)}</span>
                </div>
              </div>

              <Suspense fallback={<CmpSkeleton />}>
                <ModelComparison models={models} />
              </Suspense>

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
            </section>

            {/* ============ Section 2 · 版本代际演化(客户端切换 · 零刷新)============ */}
            <div className="flex items-end gap-3 mb-5 pb-3 border-b-2 border-dashed border-line">
              <div>
                <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-1">Evolution timeline · 代际演化</div>
                <h2 className="text-3xl font-black tracking-[-0.02em] leading-tight">版本 <em className="accent">迭代时间线</em></h2>
              </div>
            </div>

            <FamilyTimeline
              families={FAMILIES}
              counts={counts}
              timelines={timelines}
              initialFam={activeFam}
              famColors={FAM_COLORS}
            />
          </main>
        </div>
      </div>
    </>
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

function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  return `${Math.round(diffMin / 60)} 小时前`;
}
