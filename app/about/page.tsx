import Link from 'next/link';
import { Mail, Github } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { db, articles, teardowns, timelineVersions } from '@/db';
import { sql, eq } from 'drizzle-orm';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const revalidate = 300; // 5 分钟 · 你内容不是分钟级更新的

// 3 个 count 查询 · 缓存 10 分钟 · 反正是 manifesto 数字, 不追求分钟级新鲜
const getAboutCounts = unstable_cache(
  async () => {
    const [[a], [t], [tv]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(articles).where(eq(articles.isDraft, false)),
      db.select({ count: sql<number>`count(*)::int` }).from(teardowns),
      db.select({ count: sql<number>`count(*)::int` }).from(timelineVersions),
    ]);
    return { articleCount: a.count, teardownCount: t.count, timelineCount: tv.count };
  },
  ['about-counts'],
  { revalidate: 600, tags: ['articles', 'teardowns', 'timeline'] },
);

export default async function AboutPage() {
  // 用真实数据支撑 manifesto 的三个数字
  const { articleCount, teardownCount, timelineCount } = await getAboutCounts();

  return (
    <>
      {/* Hero */}
      <section className="container">
        <div className="grid gap-16 md:grid-cols-[1.4fr_1fr] items-center py-15 pt-20">
          <div>
            <h1 className="text-5xl md:text-6xl font-black leading-[1.02] tracking-[-0.04em] mb-5">
              尝试看清<br />
              <em className="accent">AI 产品的实质</em>。
            </h1>
            <p className="text-lg text-ink-soft leading-relaxed max-w-xl mb-6">
              AI Lens 是一个持续运营的独立 AI 情报站 —— 每日聚合、结构化、深度分析全球 AI 动态,
              写给那些想真正看懂 AI 而不是被信息洪流冲走的人。
            </p>
            <div className="flex flex-wrap gap-2">
              <StatBadge value="200+" label="条/天" />
              <StatBadge value="30" label="分钟自动刷新" />
              <StatBadge value="30+" label="公开信源" />
              <StatBadge value="2026.07" label="上线" />
            </div>
          </div>

          {/* 主理人卡 */}
          <div className="bg-cream border-2 border-ink rounded-2xl p-7 shadow-brutal relative overflow-hidden">
            <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.22),transparent_70%)] pointer-events-none" />
            <div className="grid grid-cols-[100px_1fr] gap-5 items-center pb-5 mb-5 border-b border-dashed border-line relative">
              <img
                src="/avatar.jpg"
                alt="Alex"
                className="w-24 h-24 rounded-full object-cover bg-bg-alt"
              />
              <div>
                <div className="text-2xl font-black tracking-tight leading-none">Alex</div>
                <div className="text-sm text-ink-soft mt-1.5">
                  <em className="accent not-italic font-serif italic bg-orange-50 px-1.5 py-0.5 rounded mr-1">主理人</em>
                  AI Lens · 海外硕士在读
                </div>
              </div>
            </div>
            <div className="text-[13.5px] leading-[1.85] text-ink-soft relative">
              <p className="mb-2.5">
                Hi,很高兴你对 AI Lens 感兴趣~ 我是 <b className="text-ink font-bold">Alex</b>,这个情报站的主理人,海外硕士在读。做过功能、策略、搜推方向的产品工作,从零搭起过 DAU 6000+ 的社区,也和朋友一起运营过高校创业论坛,一直在尝试各种新鲜的项目。
              </p>
              <p>
                一年前我还是个对 AI 一窍不通的门外汉,现在正努力成长为 AI Native 选手。在这里我会分享我的观察与思考,也期待和你一起探索 AI 的边界。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Manifesto · 全屏暖色 band */}
      <section className="relative py-24 my-16 overflow-hidden">
        <div className="absolute inset-0 -mx-[50vw] left-1/2 right-1/2 w-screen bg-gradient-to-br from-[#FFFCF6] to-[#FFF6E6]" />
        <div className="absolute top-[15%] right-[6%] w-44 h-44 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.18),transparent_70%)] pointer-events-none" />

        <div className="container relative">
          <div className="flex justify-between items-end flex-wrap gap-4 pb-4 border-b-2 border-dashed border-line mb-8">
            <div>
              <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-1">Manifesto · 为什么存在</div>
              <h2 className="text-4xl md:text-5xl font-black tracking-[-0.02em]">
                不做<em className="accent">信息瀑布</em>,做<em className="accent">信息滤镜</em>。
              </h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-[300px] leading-relaxed text-right">
              AI Lens 的三条产品原则 —— 让"看懂"比"看到"更容易。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ManifestoCard num="01" stat="30+" statLabel="公开信源" title="来源可回溯" proofs={[
              '每条资讯"·来源"可点击跳原网站',
              '侧栏实时汇总 Top 12 信源',
              '模型参数直连 OpenRouter,可核对',
            ]} />
            <ManifestoCard num="02" stat="6 维" statLabel="分析框架" title="观点有态度" proofs={[
              '每个精选:定位/痛点/解法/亮点/VC 灵感/商业',
              '每个对比:数据自动 + PM 结论手写',
              '每篇长文:作者 · 日期 · 阅读时长明标',
            ]} />
            <ManifestoCard num="03" stat="4 条" statLabel="自动化管道" title="更新有节奏" proofs={[
              '资讯流 · 每 30 分钟拉 200 条',
              '模型对比 · 每 6 小时刷 22 个',
              '每日精选 · 每日 UTC 08:13 抓 Top 10',
              '邮件周报 · 每周日 20:00 一封',
            ]} />
          </div>
        </div>
      </section>

      {/* 主理人自述 · 暖色 band 加深 */}
      <section className="relative py-24 mb-16 overflow-hidden">
        <div className="absolute inset-0 -mx-[50vw] left-1/2 right-1/2 w-screen bg-gradient-to-br from-[#FFF6E8] to-[#FFEBD0]" />
        <div className="absolute bottom-[12%] left-[4%] w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(255,184,77,0.22),transparent_70%)] pointer-events-none" />

        <div className="container relative">
          <div className="flex justify-between items-end flex-wrap gap-4 pb-4 border-b-2 border-dashed border-line mb-10">
            <div>
              <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-1">The person behind · 主理人自述</div>
              <h2 className="text-4xl md:text-5xl font-black tracking-[-0.02em]">关于 <em className="accent">我</em></h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed text-right">
              两个真心话问答 —— 这个站的观点从哪来 · 想成为什么样。
            </p>
          </div>

          {/* 双列并排:两个故事块并列(响应式:小屏堆叠)*/}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StoryBlock title="为什么做 AI Lens?">
              <p>在 AI 行业信息爆炸的当下,绝大多数人都面临同一种困境:每天摄入大量碎片化资讯,却始终难辨价值、难抓核心,看得越多,反而越容易迷失方向、消耗灵感。</p>
              <p>这也是我最初入门时的真实感受。因此我搭建了 AI Lens,希望以产品经理的视角,对全球 AI 动态做筛选、梳理与拆解,帮大家过滤噪音、高效同步行业进展。</p>
              <p>在持续输入的同时,我也会输出独立的产品拆解与行业观点,不止做信息的传递者,更想做思考的同行者,也欢迎每一位读者在这里交流想法、碰撞思路。</p>
            </StoryBlock>

            <StoryBlock title="我希望 AI Lens 成为什么?">
              <p>短期来看,它是一个能切实解决问题的实用入口 —— 让每一位想了解 AI、深耕 AI 的人,都能在这里高效获取有价值的信息,省下筛选信息的时间,真正有所收获。</p>
              <p>长期来看,我希望它成长为一个有温度、有思想、有意思的 AI 同好社区。没有冗余的流量噪音,没有空泛的行业套话,大家可以在这里平等交流、深度思考,共同探索 AI 的更多可能性。</p>
            </StoryBlock>
          </div>

          {/* 3 条信念 · 底部横排 · 补齐视觉密度 */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <PullQuote author="信念一" quote="人人都是产品经理 · 产品本应为人民。" />
            <PullQuote author="信念二" quote="AI 时代的机遇 · 是时刻关注前沿 · 尝试发展。" />
            <PullQuote author="信念三" quote="做有理想 · 有素养 · 有能力的产品经理。" />
          </div>
        </div>
      </section>

      {/* 联系方式 */}
      <section className="container mb-16">
        <div className="text-center pt-20 pb-8">
          <div className="text-xs font-black tracking-[3px] uppercase text-coral mb-5">Get in touch · 聊聊</div>
          <h2 className="text-5xl md:text-6xl font-black tracking-[-0.04em] leading-[1.05] mb-5">
            聊 AI 产品? <em className="accent">随时来</em>
          </h2>
          <p className="text-base text-ink-soft leading-relaxed max-w-lg mx-auto">
            合作、约稿、或者只是想交流想法 —— 都欢迎找我。看到消息我一定回。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[720px] mx-auto">
          <a href="mailto:Lizydy@163.com" className="grid grid-cols-[56px_1fr_auto] gap-4 items-center bg-cream border-2 border-ink rounded-xl p-6 shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition">
            <div className="w-12 h-12 rounded-lg grid place-items-center text-white border-2 border-ink bg-gradient-to-br from-coral to-gold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-black">邮箱</div>
              <div className="text-[13px] text-muted-foreground">Lizydy@163.com</div>
            </div>
            <span className="text-xl text-ink">→</span>
          </a>

          <a href="https://github.com/YIDUO123" target="_blank" rel="noopener noreferrer" className="grid grid-cols-[56px_1fr_auto] gap-4 items-center bg-cream border-2 border-ink rounded-xl p-6 shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition">
            <div className="w-12 h-12 rounded-lg grid place-items-center text-white border-2 border-ink bg-gradient-to-br from-coral to-gold">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-black">GitHub</div>
              <div className="text-[13px] text-muted-foreground">@YIDUO123</div>
            </div>
            <span className="text-xl text-ink">→</span>
          </a>
        </div>
      </section>

      {/* 打赏 · 支持独立创作 */}
      <section className="container mb-24">
        <div className="max-w-[720px] mx-auto bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-ink rounded-2xl p-8 shadow-brutal relative overflow-hidden">
          <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.22),transparent_70%)] pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center relative">
            <div>
              <div className="text-[11px] font-black tracking-[2px] uppercase text-coral mb-2">☕ Support · 支持独立创作</div>
              <h3 className="text-2xl font-black tracking-tight mb-2">
                请我喝杯 <em className="accent">咖啡</em>
              </h3>
              <p className="text-sm text-ink-soft leading-relaxed">
                AI Lens 完全免费,没广告、没付费墙、没数据卖。<br />
                如果内容让你觉得有价值,欢迎请我喝杯咖啡 —— 一杯可以让我多写一小时。
              </p>
            </div>

            <a
              href="/support"
              className="inline-flex items-center gap-2 px-5 py-3 bg-coral text-white border-2 border-ink rounded-xl font-bold shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition whitespace-nowrap"
            >
              ☕ 打赏支持
            </a>
          </div>
        </div>
      </section>

      {/* Colophon · 精简版 · 只留必要的技术栈 chip · 数据链路等技术细节移除 */}
      <section className="relative py-20 pb-24 overflow-hidden text-background">
        <div className="absolute inset-0 -mx-[50vw] left-1/2 right-1/2 w-screen bg-ink" />
        <div className="absolute -top-20 right-[10%] w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.18),transparent_70%)] pointer-events-none" />

        <div className="container relative">
          <div className="flex justify-between items-end flex-wrap gap-4 pb-4 border-b-2 border-dashed border-white/15 mb-12">
            <div>
              <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-1">Colophon · 关于本站</div>
              <h2 className="text-4xl md:text-5xl font-black tracking-[-0.02em] text-background">
                <em className="accent">怎么运转的</em>?
              </h2>
            </div>
            <p className="text-xs text-white/55 max-w-[300px] leading-relaxed text-right">
              一个人 + AI · 从 0 搭起来的
              <br />独立媒体式产品
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <TechChip icon="⚛️" name="Next.js 15" desc="React 19 + TypeScript" />
            <TechChip icon="💾" name="Supabase" desc="Postgres · 16 表" />
            <TechChip icon="🤖" name="AI 4 通道" desc="智谱 · DeepSeek 等" />
            <TechChip icon="⏰" name="GitHub Actions" desc="30 分钟自动抓取" />
          </div>

          <div className="mt-12 pt-8 border-t border-dashed border-white/15 text-center">
            <p className="text-2xl md:text-3xl font-black tracking-tight leading-tight max-w-2xl mx-auto text-white/85">
              技术是<em className="accent">路线</em> · 不是<em className="accent">目的</em>。
            </p>
            <p className="text-sm text-white/50 mt-3">
              用对工具 · 持续做下去。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-cream border-[1.5px] border-ink rounded-full px-3 py-1 text-xs font-bold">
      <b className="font-serif font-black text-coral text-sm">{value}</b>{label}
    </span>
  );
}

function ManifestoCard({ num, stat, statLabel, title, proofs }: any) {
  return (
    <div className="bg-white border-2 border-ink rounded-2xl p-7 shadow-[4px_4px_0_#1a1a1a] relative overflow-hidden hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition flex flex-col min-h-[300px]">
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.14),transparent_70%)] pointer-events-none" />

      <div className="font-serif text-4xl font-black text-bg-alt leading-none mb-1.5 relative">{num}</div>

      <div className="flex items-baseline gap-2 pb-3 mb-3 border-b border-dashed border-line relative">
        <b className="font-serif text-4xl font-black text-coral leading-none tracking-[-0.03em]">{stat}</b>
        <span className="text-[13px] text-ink-soft font-semibold">{statLabel}</span>
      </div>

      <h4 className="text-[22px] font-bold tracking-tight mb-3.5 relative">{title}</h4>

      <ul className="space-y-2 relative">
        {proofs.map((p: string, i: number) => (
          <li key={i} className="grid grid-cols-[18px_1fr] gap-2 items-baseline text-[13px] text-ink-soft leading-relaxed">
            <span className="text-coral font-black text-sm">✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StoryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/75 backdrop-blur-sm border-2 border-ink rounded-[18px] p-10 md:p-11 shadow-[5px_5px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition">
      <h3 className="text-2xl font-black tracking-tight mb-5 pl-4 border-l-[5px] border-coral">{title}</h3>
      <div className="[&>p]:text-[15px] [&>p]:leading-[1.9] [&>p]:text-ink-soft [&>p+p]:mt-2.5">
        {children}
      </div>
    </div>
  );
}

function ColItem({ label, title, desc }: { label: string; title: string; desc: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/12 rounded-xl p-5.5 hover:bg-white/[0.07] hover:border-coral hover:-translate-y-0.5 transition">
      <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">{label}</div>
      <b className="block text-[15px] font-bold text-background mb-1.5">{title}</b>
      <p className="text-[13px] text-white/60 leading-relaxed">{desc}</p>
    </div>
  );
}

// ============================================================
// 关于我 · 右侧引言墙
// ============================================================
function PullQuote({ author, quote }: { author: string; quote: string }) {
  return (
    <div className="bg-white/70 backdrop-blur-sm border-2 border-ink rounded-2xl px-5 py-4 shadow-brutal-sm">
      <div className="text-[9px] font-black tracking-[2px] uppercase text-coral mb-1.5">{author}</div>
      <p className="text-sm font-serif italic leading-relaxed text-ink">"{quote}"</p>
    </div>
  );
}

// ============================================================
// Colophon · 数据流示意 + 技术栈卡
// ============================================================
function FlowNode({ label, content, desc, accent }: { label: string; content: string; desc: string; accent?: boolean }) {
  return (
    <div className={`relative rounded-xl px-5 py-3.5 border transition hover:-translate-x-0.5 ${
      accent
        ? 'bg-coral/10 border-coral/40'
        : 'bg-white/[0.04] border-white/12 hover:bg-white/[0.07] hover:border-white/25'
    }`}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span className={`text-xs font-black tracking-wider uppercase ${accent ? 'text-coral' : 'text-white/70'}`}>{label}</span>
        <span className="text-[10px] text-white/40 font-mono">{desc}</span>
      </div>
      <div className={`text-sm font-semibold mt-1 ${accent ? 'text-background' : 'text-white/90'}`}>{content}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-0.5">
      <div className="w-px h-4 bg-gradient-to-b from-white/30 to-coral/60" />
    </div>
  );
}

function TechChip({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/12 rounded-lg p-3.5 hover:bg-white/[0.07] hover:border-coral hover:-translate-y-0.5 transition">
      <div className="text-lg mb-1.5">{icon}</div>
      <b className="block text-[13px] font-bold text-background leading-tight mb-0.5">{name}</b>
      <p className="text-[11px] text-white/50 leading-relaxed">{desc}</p>
    </div>
  );
}
