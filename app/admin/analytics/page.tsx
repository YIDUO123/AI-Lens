/**
 * /admin/analytics · 数据面板
 * 一屏看:实时今日 · AI 调用 · 内容 Top · 互动汇总 · 订阅漏斗 · 搜索洞察 · 最近事件流
 *
 * 权限:admin/editor · 服务端渲染 · 每次进都是最新数据
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { auth } from '@/lib/auth';
import { db, aiCallLogs, userEvents, articles, teardowns, dailyPicks, likes, saves, comments, newsletterSubscribers, user, newsItems } from '@/db';
import { sql, desc, eq, and, gte } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Activity, TrendingUp, MessageCircle, Bookmark, Heart, Mail, Search, Zap, ExternalLink } from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// 数据获取 · 用 unstable_cache 包一层 · 60s TTL
// 首次访问依然要跑全部 SQL(冷启动可能 5-10s)
// 但 60s 内二次访问 · 秒返 · admin 反复看数据不再痛
// ============================================================
const getAnalyticsData = unstable_cache(
  async () => {
    const [
      aiOverall, aiByProvider, aiByUseCase, aiRecent,
      eventsByName, eventsRecent,
      topArticles, topTeardowns, picksCount,
      likesCount, savesCount, commentsCount,
      subsData, usersCount, newsCount,
      searchStats,
    ] = await Promise.all([
      // AI 汇总
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE success)::int AS success,
          COUNT(*) FILTER (WHERE NOT success)::int AS fail,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int AS today,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS this_week,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE success)::int AS p95_ms
        FROM ai_call_logs
      `),
      db.execute(sql`
        SELECT provider,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE success)::int AS success,
          ROUND(AVG(duration_ms) FILTER (WHERE success))::int AS avg_ms
        FROM ai_call_logs GROUP BY provider ORDER BY total DESC
      `),
      db.execute(sql`
        SELECT use_case, COUNT(*)::int AS total
        FROM ai_call_logs GROUP BY use_case ORDER BY total DESC
      `),
      db.execute(sql`
        SELECT use_case, provider, success, duration_ms, LEFT(COALESCE(error_code, ''), 40) AS err, created_at
        FROM ai_call_logs ORDER BY created_at DESC LIMIT 8
      `),
      // 事件汇总
      db.execute(sql`
        SELECT event_name, COUNT(*)::int AS n, COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::int AS unique_sessions
        FROM user_events GROUP BY event_name ORDER BY n DESC
      `),
      db.execute(sql`
        SELECT event_name, props, path, created_at
        FROM user_events ORDER BY created_at DESC LIMIT 10
      `),
      // 内容 Top
      db.select({ id: articles.id, slug: articles.slug, title: articles.title, viewCount: articles.viewCount })
        .from(articles).where(eq(articles.isDraft, false))
        .orderBy(desc(articles.viewCount)).limit(5),
      db.select({ id: teardowns.id, slug: teardowns.slug, title: teardowns.title, viewCount: teardowns.viewCount })
        .from(teardowns).orderBy(desc(teardowns.viewCount)).limit(5),
      db.select({ n: sql<number>`count(*)::int` }).from(dailyPicks),
      // 互动
      db.select({ n: sql<number>`count(*)::int` }).from(likes),
      db.select({ n: sql<number>`count(*)::int` }).from(saves),
      db.select({ n: sql<number>`count(*)::int` }).from(comments).where(eq(comments.isHidden, false)),
      // 订阅 · 用户
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE active)::int AS active,
          COUNT(*) FILTER (WHERE active AND created_at >= NOW() - INTERVAL '7 days')::int AS new_this_week
        FROM newsletter_subscribers
      `),
      db.select({ n: sql<number>`count(*)::int` }).from(user),
      db.select({ n: sql<number>`count(*)::int` }).from(newsItems),
      // 搜索命中率
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE (props->>'is_empty')::bool = false)::int AS hit,
          COUNT(DISTINCT props->>'query_hash')::int AS unique_queries
        FROM user_events WHERE event_name='search_submit'
      `),
    ]);

    return {
      aiOverall, aiByProvider, aiByUseCase, aiRecent,
      eventsByName, eventsRecent,
      topArticles, topTeardowns, picksCount,
      likesCount, savesCount, commentsCount,
      subsData, usersCount, newsCount,
      searchStats,
    };
  },
  ['admin-analytics-data-v1'],  // cache key
  { revalidate: 60, tags: ['analytics'] },  // 60s TTL · 或者手动 revalidateTag('analytics')
);

export default async function AnalyticsDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin/analytics');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') redirect('/me');

  // ========== 一次拿完所有数据 · 走缓存 ==========
  const {
    aiOverall, aiByProvider, aiByUseCase, aiRecent,
    eventsByName, eventsRecent,
    topArticles, topTeardowns, picksCount,
    likesCount, savesCount, commentsCount,
    subsData, usersCount, newsCount,
    searchStats,
  } = await getAnalyticsData();

  const ai = aiOverall[0] as any;
  const subs = subsData[0] as any;
  const search = searchStats[0] as any;
  const successRate = ai.total ? (ai.success / ai.total * 100).toFixed(1) : '—';
  const hitRate = search.total ? (search.hit / search.total * 100).toFixed(1) : '—';

  return (
    <div className="container max-w-6xl py-10 pb-24">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>

      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Analytics Dashboard</div>
          <h1 className="text-4xl font-black tracking-[-0.03em] leading-tight mb-3">
            数据 <em className="accent">面板</em>
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            📊 综合 <b>ai_call_logs · user_events · 业务表</b> 的实时数据 · 每次进来都是最新 · 想看更细的走势请去
            <a href="https://vercel.com/yiduo123s-projects/ai-lens/analytics" target="_blank" rel="noopener" className="text-coral font-bold underline mx-1 inline-flex items-center gap-0.5">Vercel Analytics <ExternalLink className="w-3 h-3" /></a>
          </p>
        </div>
      </div>

      {/* 顶部 · 6 个关键数字 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        <BigStat icon={<Sparkles className="w-4 h-4" />} label="AI 调用" num={ai.total} sub={`成功 ${ai.success}`} color="coral" />
        <BigStat icon={<Activity className="w-4 h-4" />} label="成功率" num={`${successRate}%`} sub={`P95 ${ai.p95_ms || '—'}ms`} color="teal" />
        <BigStat icon={<Search className="w-4 h-4" />} label="搜索命中" num={`${hitRate}%`} sub={`${search.total} 次`} color="purple" />
        <BigStat icon={<Mail className="w-4 h-4" />} label="订阅者" num={subs.active} sub={`本周 +${subs.new_this_week}`} color="ink" />
        <BigStat icon={<Heart className="w-4 h-4" />} label="点赞" num={likesCount[0].n} sub={`收藏 ${savesCount[0].n}`} color="pink" />
        <BigStat icon={<MessageCircle className="w-4 h-4" />} label="评论" num={commentsCount[0].n} sub={`注册 ${usersCount[0].n} 人`} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* AI 通道分布 */}
        <section className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm">
          <SectionHeader icon={<Zap className="w-4 h-4 text-coral" />} title="🤖 AI 通道分布" note="按 provider 分" />
          {aiByProvider.length === 0 ? <Empty text="还没数据 · 用一次 AI 兜底就有" /> : (
            <div className="space-y-2">
              {(aiByProvider as any[]).map((r) => (
                <div key={r.provider} className="flex items-center gap-3 p-2.5 bg-white/50 border border-line rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-coral" />
                  <span className="font-mono text-sm font-bold w-20">{r.provider}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-bg-alt rounded-full overflow-hidden">
                      <div className="h-full bg-coral" style={{ width: `${r.total ? (r.success / r.total * 100) : 0}%` }} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{r.success}/{r.total}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{r.avg_ms || '—'}ms</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AI use_case 分布 */}
        <section className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm">
          <SectionHeader icon={<TrendingUp className="w-4 h-4 text-teal-600" />} title="🎯 AI 场景分布" note="按 use_case 分" />
          {aiByUseCase.length === 0 ? <Empty text="还没数据" /> : (
            <div className="space-y-2">
              {(aiByUseCase as any[]).map((r) => (
                <div key={r.use_case} className="flex items-center justify-between px-3 py-2 bg-white/50 border border-line rounded-lg">
                  <span className="text-sm font-mono">{r.use_case}</span>
                  <span className="text-sm font-mono font-bold">{r.total}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top 5 洞察长文 */}
        <section className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm">
          <SectionHeader icon="✍️" title="Top 洞察长文" note="按阅读量" />
          {topArticles.length === 0 ? <Empty text="还没发布长文" /> : (
            <ol className="space-y-1">
              {topArticles.map((a, i) => (
                <li key={a.id}>
                  <Link href={`/insights/${a.slug}`} target="_blank" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-bg-alt transition">
                    <span className={`font-serif font-black text-lg w-6 text-center ${i === 0 ? 'text-coral' : i === 1 ? 'text-amber-600' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <span className="text-sm font-bold truncate flex-1 min-w-0">{a.title}</span>
                    <span className="text-xs font-mono text-muted-foreground">👁 {a.viewCount || 0}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Top 5 拆解 */}
        <section className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm">
          <SectionHeader icon="🔬" title="Top 产品拆解" note="按阅读量" />
          {topTeardowns.length === 0 ? <Empty text="还没发布拆解" /> : (
            <ol className="space-y-1">
              {topTeardowns.map((t, i) => (
                <li key={t.id}>
                  <Link href={`/teardowns/${t.slug}`} target="_blank" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-bg-alt transition">
                    <span className={`font-serif font-black text-lg w-6 text-center ${i === 0 ? 'text-coral' : i === 1 ? 'text-amber-600' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <span className="text-sm font-bold truncate flex-1 min-w-0">{t.title}</span>
                    <span className="text-xs font-mono text-muted-foreground">👁 {t.viewCount || 0}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 事件分布 */}
        <section className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm">
          <SectionHeader icon="📊" title="用户事件分布" note="user_events 表" />
          {eventsByName.length === 0 ? <Empty text="等触发第一个事件" /> : (
            <div className="space-y-2">
              {(eventsByName as any[]).map((r) => (
                <div key={r.event_name} className="flex items-center justify-between px-3 py-2 bg-white/50 border border-line rounded-lg">
                  <span className="text-sm font-mono">{r.event_name}</span>
                  <span className="text-xs font-mono text-muted-foreground">{r.unique_sessions} unique</span>
                  <span className="text-sm font-mono font-bold w-10 text-right">{r.n}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 站内库存 */}
        <section className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm">
          <SectionHeader icon="📚" title="站内库存" note="业务表" />
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="洞察长文" num={topArticles.length} unit="发布" />
            <MiniStat label="产品拆解" num={topTeardowns.length} unit="发布" />
            <MiniStat label="每日精选" num={picksCount[0].n} unit="条" />
            <MiniStat label="资讯池" num={newsCount[0].n} unit="条" />
          </div>
        </section>
      </div>

      {/* 最近事件 · raw 流 */}
      <section className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm mb-8">
        <SectionHeader icon="🌊" title="实时事件流" note="最近 10 条" />
        {eventsRecent.length === 0 ? <Empty text="等第一个用户操作" /> : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {(eventsRecent as any[]).map((e, i) => (
              <div key={i} className="text-xs font-mono px-3 py-1.5 bg-white/60 border border-line rounded flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground w-32 shrink-0">{new Date(e.created_at).toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })}</span>
                <span className="font-bold text-coral">{e.event_name}</span>
                <span className="text-muted-foreground text-[10px] truncate min-w-0 flex-1">
                  {typeof e.props === 'object' ? JSON.stringify(e.props) : ''} {e.path ? '· ' + e.path : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm">
        <SectionHeader icon="🤖" title="最近 AI 调用" note="ai_call_logs" />
        {aiRecent.length === 0 ? <Empty text="等第一次 AI 调用" /> : (
          <div className="space-y-1">
            {(aiRecent as any[]).map((r, i) => (
              <div key={i} className="text-xs font-mono px-3 py-1.5 bg-white/60 border border-line rounded flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground w-32 shrink-0">{new Date(r.created_at).toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })}</span>
                <span className={`font-bold w-16 shrink-0 ${r.success ? 'text-green-600' : 'text-red-500'}`}>{r.success ? '✓' : '✗'} {r.provider}</span>
                <span className="text-ink w-32 shrink-0 truncate">{r.use_case}</span>
                <span className="text-muted-foreground">{r.duration_ms}ms</span>
                {r.err && <span className="text-red-500 truncate">{r.err}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------- 小组件 ----------
function BigStat({ icon, label, num, sub, color }: { icon: React.ReactNode; label: string; num: number | string; sub?: string; color: string }) {
  const colorClass: Record<string, string> = {
    coral: 'text-coral',
    teal: 'text-teal-600',
    purple: 'text-purple-600',
    ink: 'text-ink',
    pink: 'text-pink-600',
    amber: 'text-amber-700',
  };
  return (
    <div className="bg-cream border-2 border-ink rounded-xl p-3 shadow-brutal-sm">
      <div className={`mb-1 ${colorClass[color] || 'text-ink'}`}>{icon}</div>
      <div className="font-serif font-black text-2xl leading-none mb-0.5">{num}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
      {sub && <div className="text-[9px] text-muted-foreground/70 font-mono">{sub}</div>}
    </div>
  );
}

function SectionHeader({ icon, title, note }: { icon: React.ReactNode; title: string; note?: string }) {
  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-dashed border-line">
      <h3 className="font-black text-sm flex items-center gap-1.5">
        {typeof icon === 'string' ? <span>{icon}</span> : icon}
        {title}
      </h3>
      {note && <span className="text-[10px] text-muted-foreground font-mono">{note}</span>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-6 text-xs text-muted-foreground italic">{text}</div>;
}

function MiniStat({ label, num, unit }: { label: string; num: number; unit: string }) {
  return (
    <div className="bg-white/60 border border-line rounded-lg px-3 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-lg font-serif font-black text-ink leading-tight">{num}<span className="text-[10px] font-normal text-muted-foreground ml-1">{unit}</span></div>
    </div>
  );
}
