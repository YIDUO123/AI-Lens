/**
 * /me · 读者个人主页
 * 显示个人信息 · 收藏 · 阅读活动
 * (评论 / 订阅是 Batch 16 加)
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db, saves, comments } from '@/db';
import { eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Bookmark, MessageCircle, User as UserIcon, Settings, LogOut, ArrowRight, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/me');

  const user = session.user;
  const role = (user as any).role || 'reader';
  const isEditor = role === 'admin' || role === 'editor';

  // 收藏 & 评论计数
  const [[savesCount], [commentsCount]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(saves).where(eq(saves.userId, user.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(comments).where(eq(comments.userId, user.id)),
  ]);

  const joinedAt = user.createdAt ? new Date(user.createdAt as any) : new Date();
  const joinedDays = Math.max(1, Math.floor((Date.now() - joinedAt.getTime()) / 86400000));

  return (
    <div className="container max-w-4xl py-12 pb-24">
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
                role === 'admin' ? 'bg-coral text-white' :
                role === 'editor' ? 'bg-gold text-ink' :
                'bg-bg-alt text-ink-soft'
              }`}>{role}</span>
              <span className="text-[11px] text-muted-foreground">在这里 {joinedDays} 天</span>
            </div>
          </div>

          {isEditor && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-ink text-background border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-y-0.5 transition"
            >
              <Settings className="w-4 h-4" /> 编辑后台
            </Link>
          )}
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatBox icon={<Bookmark className="w-4 h-4" />} num={savesCount?.n || 0} label="收藏" />
        <StatBox icon={<MessageCircle className="w-4 h-4" />} num={commentsCount?.n || 0} label="评论" />
        <StatBox icon={<Sparkles className="w-4 h-4" />} num={joinedDays} label="访问天数" />
      </div>

      {/* 我的收藏 */}
      <section className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm mb-6">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-lg font-black flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-coral" /> 我的收藏
          </h2>
          <span className="text-xs text-muted-foreground">{savesCount?.n || 0} 项</span>
        </div>

        {(savesCount?.n || 0) === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            还没有收藏 · 在<Link href="/teardowns" className="text-coral font-bold underline mx-1">产品拆解</Link>的每日精选里点"采集灵感"就能收藏
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Batch 16 会展示完整收藏列表 · 目前收藏已被记录 ✓</p>
        )}
      </section>

      {/* 探索推荐 */}
      <section className="bg-ink text-background rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.22),transparent_70%)] pointer-events-none" />

        <div className="relative">
          <div className="text-[10px] font-black tracking-widest text-coral mb-2">Explore</div>
          <h2 className="text-2xl font-black mb-1">今天有什么值得看?</h2>
          <p className="text-sm text-white/60 mb-5">从这几个入口开始</p>

          <div className="grid grid-cols-2 gap-3">
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

function ExploreLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/15 rounded-lg hover:bg-white/10 hover:border-coral transition"
    >
      <div>
        <div className="text-sm font-bold">{label}</div>
        <div className="text-[10px] text-white/50">{desc}</div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-white/50" />
    </Link>
  );
}
