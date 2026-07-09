/**
 * Report Container · 根据 active tab 渲染不同报告
 * 全部服务端组件,直接查数据库
 */
import { getRecentReleases, getReleaseFamilyStats, getNewsInWindow } from '@/lib/db/queries';

const FAMILY_META: Record<string, { icon: string; name: string; color: string }> = {
  openai:     { icon: '🤖', name: 'OpenAI',    color: '#10a37f' },
  anthropic:  { icon: '🧠', name: 'Anthropic', color: '#C15F3C' },
  google:     { icon: '🔷', name: 'Google',    color: '#4285F4' },
  deepseek:   { icon: '🔍', name: 'DeepSeek',  color: '#6c5ce7' },
  qwen:       { icon: '🎯', name: 'Qwen',      color: '#FF4A50' },
  bytedance:  { icon: '🎵', name: '字节',      color: '#FF3366' },
  kimi:       { icon: '🌙', name: 'Kimi',      color: '#7C3AED' },
  meta:       { icon: '📘', name: 'Meta',      color: '#0064E0' },
  mistral:    { icon: '🌊', name: 'Mistral',   color: '#FF7000' },
  cursor:     { icon: '⚡', name: 'Cursor',    color: '#1a1a1a' },
  perplexity: { icon: '🔮', name: 'Perplexity',color: '#20B2AA' },
  xai:        { icon: '𝕏', name: 'xAI',       color: '#000000' },
  huggingface:{ icon: '🤗', name: 'HuggingFace', color: '#FFD200' },
};

function mapCatGroup(raw: string | null): 'launch' | 'industry' | 'paper' | 'tip' {
  if (raw === 'ai-models' || raw === 'ai-products') return 'launch';
  if (raw === 'industry') return 'industry';
  if (raw === 'paper') return 'paper';
  return 'tip';
}

function fmtRelTime(date: Date | string): string {
  const d = new Date(date);
  const diffH = Math.round((Date.now() - d.getTime()) / 3600000);
  if (diffH < 1) return '刚刚';
  if (diffH < 24) return diffH + 'h 前';
  const days = Math.round(diffH / 24);
  if (days < 30) return days + 'd 前';
  return (d.getMonth() + 1) + '.' + d.getDate();
}

export async function ReportContainer({ tab, activeFam }: { tab: string; activeFam: string }) {
  if (tab === 'releases') return <ReleasesReport activeFam={activeFam} />;
  if (tab === 'weekly')   return <WindowReport days={7}  variant="weekly"  label="WEEKLY ROUNDUP" title="本周 AI 要闻" />;
  if (tab === 'monthly')  return <WindowReport days={30} variant="monthly" label="MONTHLY TRENDS" title="本月 AI 趋势" />;
  return <WindowReport days={1} variant="daily" label="DAILY DIGEST" title="今日 AI 日报" isDaily />;
}

// ============================================================
// 家族动态报告
// ============================================================
async function ReleasesReport({ activeFam }: { activeFam: string }) {
  const [releases, stats] = await Promise.all([getRecentReleases(60), getReleaseFamilyStats()]);
  const filtered = activeFam === 'all' ? releases : releases.filter((r) => r.family === activeFam);

  return (
    <ReportHero variant="releases" label="FRESH DROPS" title={<>这周 AI 界 <em className="accent">发生了什么</em></>} dateLine={`共 ${releases.length} 条发布事件 · 覆盖 ${Object.keys(stats).length} 个家族`}>
      <p className="text-sm text-ink-soft mb-4 max-w-2xl leading-relaxed">
        从新闻中自动提取的"发布/上线/开源"事件,按 AI 家族筛选。点击卡片跳转到原始新闻。
      </p>

      {/* 家族筛选 chip */}
      <div className="flex flex-wrap gap-2 mb-5">
        <FamilyChip href="/news?tab=releases" active={activeFam === 'all'} icon="" name="全部" count={releases.length} />
        {Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([fam, cnt]) => {
          const m = FAMILY_META[fam] || { icon: '📦', name: fam };
          return (
            <FamilyChip key={fam} href={`/news?tab=releases&fam=${fam}`} active={activeFam === fam} icon={m.icon} name={m.name} count={cnt} />
          );
        })}
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.slice(0, 14).map((r) => {
          const m = FAMILY_META[r.family] || { icon: '📦', name: r.family, color: '#666' };
          return (
            <article key={r.id} className="bg-white/75 border border-ink/12 rounded-xl px-4 py-3.5 hover:bg-white hover:border-ink hover:-translate-y-0.5 transition flex flex-col gap-1.5">
              <span
                className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase text-white"
                style={{ background: m.color }}
              >
                {m.icon} {m.name}
              </span>
              <h4 className="text-sm font-bold leading-snug tracking-tight">
                <a href={r.url || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-coral">{r.title}</a>
              </h4>
              {r.summary && <p className="text-xs text-ink-soft leading-relaxed line-clamp-2">{r.summary}</p>}
              <div className="mt-auto pt-2 border-t border-dashed border-ink/12 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-mono text-coral font-bold">{fmtRelTime(r.publishedAt)}</span>
                <span className="truncate max-w-[60%]">{cleanSource(r.source)}</span>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="col-span-full text-center py-10 text-muted-foreground text-sm">当前家族暂无最新发布事件</div>
      )}
    </ReportHero>
  );
}

// ============================================================
// 时间窗口报告(日/周/月)
// ============================================================
async function WindowReport({ days, label, title, isDaily, variant }: { days: number; label: string; title: string; isDaily?: boolean; variant: 'daily' | 'weekly' | 'monthly' }) {
  const items = await getNewsInWindow(days);
  const groups = {
    launch:   items.filter((x) => mapCatGroup(x.category) === 'launch'),
    industry: items.filter((x) => mapCatGroup(x.category) === 'industry'),
    paper:    items.filter((x) => mapCatGroup(x.category) === 'paper'),
    tip:      items.filter((x) => mapCatGroup(x.category) === 'tip'),
  };
  const dateLine = isDaily
    ? `今日 · 共 ${items.length} 条`
    : `过去 ${days} 天 · 共 ${items.length} 条`;

  const catConfig = [
    { key: 'launch',   icon: '🚀', label: '模型 & 产品发布' },
    { key: 'industry', icon: '📊', label: '行业动态' },
    { key: 'paper',    icon: '📄', label: '论文研究' },
    { key: 'tip',      icon: '💡', label: '技巧观点' },
  ] as const;

  return (
    <ReportHero variant={variant} label={label} title={<>{title.split(' AI ')[0]} <em className="accent">AI {title.split(' AI ')[1]}</em></>} dateLine={dateLine}>
      <p className="text-sm text-ink-soft mb-4 max-w-2xl leading-relaxed">
        {isDaily ? '编辑视角的主题聚合,从当日全部动态中筛出真正值得关注的。' : '按主题聚合,数字越多说明该赛道近期越活跃。'}
      </p>

      {/* 统计条 */}
      <div className="grid grid-cols-4 gap-0 mb-4 bg-white/50 rounded-lg border border-ink/10 overflow-hidden">
        {catConfig.map((c) => (
          <div key={c.key} className="p-3 text-center border-r border-ink/8 last:border-r-0">
            <div className="font-serif text-2xl font-black text-coral leading-none">{groups[c.key].length}</div>
            <div className="text-[10px] text-ink-soft mt-1">{c.icon} {c.label.split(' ')[0]}</div>
          </div>
        ))}
      </div>

      {/* 4 个分组 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {catConfig.map((cfg) => {
          const secItems = groups[cfg.key].slice(0, isDaily ? 4 : 6);
          if (secItems.length === 0) return null;
          return (
            <div key={cfg.key} className="bg-white/72 border border-ink/12 rounded-xl px-4 py-3.5">
              <div className="flex justify-between items-baseline pb-2.5 mb-2.5 border-b border-dashed border-ink/15">
                <span className="text-xs font-black">{cfg.icon} {cfg.label}</span>
                <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded text-muted-foreground">{groups[cfg.key].length} 条</span>
              </div>
              <ul className="space-y-1.5 list-none">
                {secItems.map((it) => (
                  <li key={it.id} className="text-xs leading-relaxed pl-3.5 relative">
                    <span className="absolute left-0 top-2 w-1 h-1 rounded-full bg-coral" />
                    <a href={it.url || '#'} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-coral hover:underline">
                      {it.title}
                    </a>
                    {it.source && <span className="block text-[10px] text-muted-foreground mt-0.5">— {cleanSource(it.source)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </ReportHero>
  );
}

// ============================================================
// 通用 hero 包装
// ============================================================
function ReportHero({ label, title, dateLine, children, variant = 'daily' }: { label: string; title: React.ReactNode; dateLine: string; children: React.ReactNode; variant?: 'daily' | 'weekly' | 'monthly' | 'releases' }) {
  const variantBg: Record<string, string> = {
    daily:    'bg-gradient-to-br from-orange-50 via-orange-100/40 to-amber-100/70',
    weekly:   'bg-gradient-to-br from-blue-50 via-cyan-100/40 to-teal-100/60',
    monthly:  'bg-gradient-to-br from-purple-50 via-violet-100/40 to-indigo-100/50',
    releases: 'bg-gradient-to-br from-orange-100 via-amber-100/60 to-yellow-100/50',
  };
  const variantAccent: Record<string, string> = {
    daily:    'rgba(255,107,53,0.12)',
    weekly:   'rgba(14,92,90,0.14)',
    monthly:  'rgba(124,58,237,0.14)',
    releases: 'rgba(255,107,53,0.18)',
  };

  return (
    <section id="report-container" className={`relative overflow-hidden rounded-2xl ${variantBg[variant]} border-2 border-ink p-7 md:p-9 shadow-brutal mb-7`}>
      <div className="absolute top-5 -right-8 rotate-[35deg] bg-ink text-background text-[10px] font-black tracking-widest px-10 py-1">
        {label}
      </div>
      <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${variantAccent[variant]}, transparent 70%)` }} />

      <div className="flex justify-between items-baseline flex-wrap gap-3 mb-1.5 relative">
        <div className="flex items-center gap-3 text-2xl md:text-3xl font-black tracking-[-0.02em]">
          {title}
        </div>
        <span className="font-mono text-xs text-ink-soft">{dateLine}</span>
      </div>

      <div className="relative">{children}</div>
    </section>
  );
}

function FamilyChip({ href, active, icon, name, count }: { href: string; active: boolean; icon: string; name: string; count: number }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition border ${
        active
          ? 'bg-ink text-background border-ink'
          : 'bg-white/70 border-ink/15 text-ink-soft hover:border-ink'
      }`}
    >
      {icon && <span>{icon}</span>}
      <span>{name}</span>
      <b className={`font-serif font-black text-xs ${active ? 'text-gold' : 'text-coral'}`}>{count}</b>
    </a>
  );
}

function cleanSource(s: string | null): string {
  if (!s) return '';
  return s.replace(/\s*(?:（RSS）|\(RSS\))/g, '').replace(/^X[::]\s*/, '𝕏 ').trim();
}
