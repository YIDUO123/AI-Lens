/**
 * /admin · 创作者仪表盘
 * 展示编辑核心数据 · 提供快捷入口 · 未来 Batch 16 加真正的富文本编辑器
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, articles, teardowns, timelineVersions, dailyPicks, newsItems, newsletterSubscribers } from '@/db';
import { sql, eq } from 'drizzle-orm';
import Link from 'next/link';
import { FileText, BookOpen, Rocket, Star, Newspaper, ArrowRight, Database, ExternalLink, User as UserIcon, Coffee } from 'lucide-react';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin');

  const user = session.user;
  const role = (user as any).role || 'reader';

  // 只有 admin / editor 能进后台;reader 跳转到个人主页
  if (role !== 'admin' && role !== 'editor') {
    redirect('/me');
  }

  // 内容统计
  const [[a], [t], [tv], [dp], [n], [nl]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(articles),
    db.select({ n: sql<number>`count(*)::int` }).from(teardowns),
    db.select({ n: sql<number>`count(*)::int` }).from(timelineVersions),
    db.select({ n: sql<number>`count(*)::int` }).from(dailyPicks),
    db.select({ n: sql<number>`count(*)::int` }).from(newsItems),
    db.select({ n: sql<number>`count(*)::int` }).from(newsletterSubscribers).where(eq(newsletterSubscribers.active, true)),
  ]);

  return (
    <div className="container max-w-5xl py-12 pb-24">
      {/* 头部 · 欢迎 + 用户信息 */}
      <div className="mb-10 grid gap-6 md:grid-cols-[1fr_320px] items-start">
        <div>
          <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-2">Creator Dashboard</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-[-0.03em] leading-[1.1] mb-2">
            欢迎回来,<em className="accent">{user.name}</em>
          </h1>
          <p className="text-ink-soft">
            这里是你的创作者仪表盘 · 站点已上线运行 · 数据每天自动刷新
          </p>
        </div>

        {/* 用户身份小卡 */}
        <div className="bg-cream border-2 border-ink rounded-xl p-4 shadow-brutal-sm flex items-center gap-3">
          {user.image ? (
            <img src={user.image} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-ink flex-shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-full border-2 border-ink bg-gradient-to-br from-coral to-gold grid place-items-center text-white font-black text-lg flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black truncate">{user.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block px-1.5 py-0 rounded text-[9px] font-black tracking-widest uppercase ${
                role === 'admin' ? 'bg-coral text-white' : role === 'editor' ? 'bg-gold text-ink' : 'bg-bg-alt text-ink-soft'
              }`}>
                {role}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 内容统计 · 5 张卡 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        <StatBox icon={<Rocket className="w-4 h-4" />} num={dp.n} label="创投精选" color="text-coral" />
        <StatBox icon={<Newspaper className="w-4 h-4" />} num={n.n} label="资讯" color="text-blue-600" />
        <StatBox icon={<BookOpen className="w-4 h-4" />} num={t.n} label="产品拆解" color="text-teal" />
        <StatBox icon={<Star className="w-4 h-4" />} num={tv.n} label="迭代版本" color="text-amber-700" />
        <StatBox icon={<FileText className="w-4 h-4" />} num={a.n} label="洞察长文" color="text-purple-600" />
      </div>

      {/* 快捷入口 · 3 大区块 */}
      <div className="grid gap-6 md:grid-cols-2 mb-10">
        {/* 内容管理 */}
        <section className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm">
          <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Content · 内容管理</div>
          <h3 className="text-xl font-black mb-1">编辑站点内容</h3>
          <p className="text-sm text-ink-soft mb-4 leading-relaxed">
            精选补 6 维 · URL 采集器 · 富文本长文 · 全部支持 admin 端操作。
          </p>

          <div className="space-y-2">
            <AdminLink href="/admin/picks"     icon="🌟" label="每日精选编辑器"   badge={`补 6 维 · AI 兜底`} coral />
            <AdminLink href="/admin/insights"  icon="✍️" label="洞察长文编辑器"   badge={`Markdown 双栏 · 实时预览 · ${a.n} 篇`} coral />
            <AdminLink href="/admin/collect"   icon="🔗" label="URL 观点采集器"   badge="外部观点 + 你的评注" />
            <AdminLink href="/admin/teardowns" icon="🔬" label="产品拆解编辑器"   badge={`Markdown 双栏 · ${t.n} 篇`} coral />
            <AdminLink href="/admin/timeline"  icon="🔄" label="时间线快速添加"   badge={`一屏表单 · ${tv.n} 版本`} coral />
            <AdminLink href="/admin/analytics" icon="📊" label="数据面板"           badge="AI · 事件 · 内容 · 一屏看" coral />
          </div>
        </section>

        {/* 站点状态 */}
        <section className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm">
          <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Status · 站点状态</div>
          <h3 className="text-xl font-black mb-1">运行监控</h3>
          <p className="text-sm text-ink-soft mb-4 leading-relaxed">
            数据管道每天自动跑一次 · 用户注册收藏都在正常记录中。
          </p>

          <div className="space-y-2">
            <StatusLine label="资讯" value="每天自动抓取 200 条" ok />
            <StatusLine label="模型对比" value="每天自动刷新" ok />
            <StatusLine label="创投精选" value="每天 8:21 抓取" ok />
            <StatusLine label="归档" value="每周一 3:07 清理旧数据" ok />
            <StatusLine label="Newsletter" value={`${nl.n} 位订阅者 · 每周日 20:00 发送`} ok />
          </div>

          <div className="mt-4 pt-4 border-t border-dashed border-line flex gap-2 text-xs">
            <a href="https://vercel.com/yiduo123s-projects/ai-lens" target="_blank" rel="noopener" className="text-coral font-bold hover:underline inline-flex items-center gap-1">
              Vercel Dashboard <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-muted-foreground">·</span>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="text-coral font-bold hover:underline inline-flex items-center gap-1">
              Supabase Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>
      </div>

      {/* 快速跳转 */}
      <section className="bg-ink text-background rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.2),transparent_70%)] pointer-events-none" />

        <div className="relative">
          <div className="text-[10px] font-black tracking-widest text-coral mb-2">Quick Actions</div>
          <h3 className="text-xl font-black mb-5">跳到公开站点</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <QuickLink href="/" label="首页" />
            <QuickLink href="/news" label="AI 资讯" />
            <QuickLink href="/teardowns" label="产品拆解" />
            <QuickLink href="/timeline" label="迭代追踪" />
            <QuickLink href="/insights" label="洞察专栏" />
            <QuickLink href="/about" label="关于" />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatBox({ icon, num, label, color }: { icon: React.ReactNode; num: number; label: string; color: string }) {
  return (
    <div className="bg-cream border-2 border-ink rounded-xl p-4 shadow-brutal-sm">
      <div className={`mb-1.5 ${color}`}>{icon}</div>
      <div className="font-serif font-black text-2xl leading-none mb-0.5">{num}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function ContentShortcut({ label, table, count }: { label: string; table: string; count: number }) {
  return (
    <a
      href={`https://supabase.com/dashboard/project/_/editor`}
      target="_blank"
      rel="noopener"
      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-bg-alt transition group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Database className="w-4 h-4 text-ink-soft flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-bold truncate">{label}</div>
          <code className="text-[10px] font-mono text-muted-foreground">{table}</code>
        </div>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-coral">
        <span className="text-xs font-mono">{count}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </a>
  );
}

function AdminLink({ href, icon, label, badge, coral }: { href: string; icon: string; label: string; badge?: string; coral?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition group ${
        coral ? 'border-coral bg-coral/5 hover:bg-coral/10' : 'border-line hover:bg-bg-alt'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg">{icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-bold truncate">{label}</div>
          {badge && <div className="text-[10px] text-muted-foreground">{badge}</div>}
        </div>
      </div>
      <ArrowRight className={`w-3.5 h-3.5 ${coral ? 'text-coral' : 'text-muted-foreground'} group-hover:translate-x-0.5 transition`} />
    </Link>
  );
}

function StatusLine({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="font-semibold">{label}</span>
      </span>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/15 rounded-lg text-sm font-bold hover:bg-white/10 hover:border-coral transition"
    >
      <span>{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
    </Link>
  );
}
