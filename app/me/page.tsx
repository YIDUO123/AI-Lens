import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, comments } from '@/db';
import { eq, sql } from 'drizzle-orm';
import { getUserSaves, getUserLikes } from '@/lib/db/queries';
import Link from 'next/link';
import { Bookmark, Heart, MessageCircle, Settings, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const dynamic = 'force-dynamic';

export default async function MePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/me');

  const user = session.user;
  const role = (user as any).role || 'reader';
  const isEditor = role === 'admin' || role === 'editor';

  const [savesData, likesData, [commentsCount]] = await Promise.all([
    getUserSaves(user.id),
    getUserLikes(user.id),
    db.select({ n: sql<number>`count(*)::int` }).from(comments).where(eq(comments.userId, user.id)),
  ]);

  const joinedAt = user.createdAt ? new Date(user.createdAt as any) : new Date();
  const joinedDays = Math.max(1, Math.floor((Date.now() - joinedAt.getTime()) / 86400000));

  return (
    <div className="container max-w-5xl py-12 pb-24">
      {/* Hero */}
      <div className="bg-cream border-2 border-ink rounded-2xl p-8 shadow-brutal mb-8 relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.18),transparent_70%)] pointer-events-none" />

        <div className="grid grid-cols-[80px_1fr_auto] gap-5 items-center relative">
          {user.image ? (
            <img src={user.image} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-ink" />
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-ink bg-gradient-to-br from-coral to-gold grid place-items-center text-white font-black text-3xl">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-none mb-1.5">{user.name}</h1>
            <div className="text-sm text-ink-soft mb-2">{user.email}</div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${
                role === 'admin' ? 'bg-coral text-white' : role === 'editor' ? 'bg-gold text-ink' : 'bg-bg-alt text-ink-soft'
              }`}>{role}</span>
              <span className="text-[11px] text-muted-foreground">在这里 {joinedDays} 天</span>
            </div>
          </div>

          {isEditor && (
            <Link href="/admin" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-ink text-background border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-y-0.5 transition">
              <Settings className="w-4 h-4" /> 编辑后台
            </Link>
          )}
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatBox icon={<Bookmark className="w-4 h-4" />} num={savesData.total} label="收藏" />
        <StatBox icon={<Heart className="w-4 h-4" />} num={likesData.total} label="点赞" />
        <StatBox icon={<MessageCircle className="w-4 h-4" />} num={commentsCount?.n || 0} label="评论" />
      </div>

      {/* 我的收藏 */}
      <section className="mb-8">
        <SectionHeader icon="⭐" title="我的收藏" count={savesData.total} kicker="Saved · 采集的灵感" />

        {savesData.total === 0 ? (
          <EmptyState hint="在" linkHref="/teardowns#picks" linkLabel="产品拆解" tail=" 或洞察长文里点收藏,内容会出现在这里。" />
        ) : (
          <div className="space-y-6">
            {savesData.news_items.length > 0 && <SubGroup title="AI 资讯" items={savesData.news_items} kind="news_item" />}
            {savesData.daily_picks.length > 0 && <SubGroup title="每日创投精选" items={savesData.daily_picks} kind="daily_pick" />}
            {savesData.articles.length > 0 && <SubGroup title="洞察长文" items={savesData.articles} kind="article" />}
            {savesData.teardowns.length > 0 && <SubGroup title="产品拆解" items={savesData.teardowns} kind="teardown" />}
          </div>
        )}
      </section>

      {/* 我的点赞 */}
      <section className="mb-8">
        <SectionHeader icon="❤️" title="我的点赞" count={likesData.total} kicker="Liked · 觉得赞的内容" />

        {likesData.total === 0 ? (
          <EmptyState hint="读到共鸣的内容,点个 ❤️ 就会记录在这里。" linkHref="/insights" linkLabel="从洞察长文开始" tail="" />
        ) : (
          <div className="space-y-6">
            {likesData.news_items.length > 0 && <SubGroup title="AI 资讯" items={likesData.news_items} kind="news_item" />}
            {likesData.articles.length > 0 && <SubGroup title="洞察长文" items={likesData.articles} kind="article" />}
            {likesData.teardowns.length > 0 && <SubGroup title="产品拆解" items={likesData.teardowns} kind="teardown" />}
            {likesData.daily_picks.length > 0 && <SubGroup title="每日创投精选" items={likesData.daily_picks} kind="daily_pick" />}
          </div>
        )}
      </section>

      {/* 探索推荐 */}
      <section className="bg-ink text-background rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.22),transparent_70%)] pointer-events-none" />

        <div className="relative">
          <div className="text-[10px] font-black tracking-widest text-coral mb-2">Explore</div>
          <h2 className="text-2xl font-black mb-1">今天有什么值得看?</h2>
          <p className="text-sm text-white/60 mb-5">从这几个入口开始</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ExploreLink href="/news" label="AI 资讯" desc="今日精选" />
            <ExploreLink href="/teardowns#picks" label="每日创投" desc="6 维分析" />
            <ExploreLink href="/insights" label="洞察长文" desc="PM 视角" />
            <ExploreLink href="/timeline" label="迭代追踪" desc="AI 家族演化" />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatBox({ icon, num, label }: { icon: React.ReactNode; num: number; label: string }) {
  return (
    <div className="bg-cream border-2 border-ink rounded-xl p-4 shadow-brutal-sm">
      <div className="text-coral mb-1.5">{icon}</div>
      <div className="font-serif font-black text-2xl leading-none mb-0.5">{num}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function SectionHeader({ icon, title, count, kicker }: { icon: string; title: string; count: number; kicker: string }) {
  return (
    <div className="flex justify-between items-baseline mb-4 pb-3 border-b-2 border-dashed border-line">
      <div>
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-1">{kicker}</div>
        <h2 className="text-xl font-black flex items-center gap-2">
          <span>{icon}</span> {title}
          <span className="text-sm font-mono font-normal text-muted-foreground bg-bg-alt px-2 py-0.5 rounded">{count}</span>
        </h2>
      </div>
    </div>
  );
}

function EmptyState({ hint, linkHref, linkLabel, tail }: { hint: string; linkHref: string; linkLabel: string; tail: string }) {
  return (
    <div className="text-center py-10 bg-bg-alt/50 border-2 border-dashed border-line rounded-xl">
      <p className="text-sm text-ink-soft">
        {hint}
        <Link href={linkHref} className="text-coral font-bold underline mx-1">{linkLabel}</Link>
        {tail}
      </p>
    </div>
  );
}

function SubGroup({ title, items, kind }: { title: string; items: any[]; kind: 'article' | 'teardown' | 'daily_pick' | 'news_item' }) {
  return (
    <div>
      <h3 className="text-xs font-black tracking-widest uppercase text-ink-soft mb-2.5">{title} · {items.length}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it) => <SaveCard key={it.id} it={it} kind={kind} />)}
      </div>
    </div>
  );
}

function SaveCard({ it, kind }: { it: any; kind: 'article' | 'teardown' | 'daily_pick' | 'news_item' }) {
  if (kind === 'daily_pick') {
    return (
      <a href={it.url || '#'} target="_blank" rel="noopener noreferrer" className="bg-cream border-2 border-ink rounded-xl p-4 flex gap-3 items-center hover:-translate-y-0.5 transition shadow-brutal-sm">
        <div className="w-11 h-11 rounded-lg grid place-items-center text-lg text-white border-2 border-ink flex-shrink-0" style={{ background: it.logoColor || '#1a1a1a' }}>
          {it.logo || '🚀'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate">{it.name}</div>
          <div className="text-xs text-ink-soft line-clamp-1">{it.tagline}</div>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </a>
    );
  }
  if (kind === 'news_item') {
    return (
      <a href={it.url || '#'} target="_blank" rel="noopener noreferrer" className="bg-cream border-2 border-ink rounded-xl p-4 flex gap-3 items-center hover:-translate-y-0.5 transition shadow-brutal-sm">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm mb-0.5 line-clamp-2">{it.title}</div>
          <div className="text-[10px] text-muted-foreground truncate">{it.source || 'AI 资讯'}</div>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </a>
    );
  }
  const href = kind === 'article' ? `/insights/${it.slug}` : `/teardowns/${it.slug}`;
  return (
    <Link href={href} className="bg-cream border-2 border-ink rounded-xl p-4 flex gap-3 items-center hover:-translate-y-0.5 transition shadow-brutal-sm">
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm mb-0.5 line-clamp-1">{it.title}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{it.category}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

function ExploreLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/15 rounded-lg hover:bg-white/10 hover:border-coral transition">
      <div>
        <div className="text-sm font-bold">{label}</div>
        <div className="text-[10px] text-white/50">{desc}</div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-white/50" />
    </Link>
  );
}
