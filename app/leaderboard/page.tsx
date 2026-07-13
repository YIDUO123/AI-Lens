/**
 * /leaderboard · 内容排行榜
 * 3 榜合一:热门(likes+saves 加权)· 阅读(views)· 讨论(comments)
 * 跨类型统计:articles + teardowns + dailyPicks
 */
import Link from 'next/link';
import { db, articles, teardowns, dailyPicks, likes, saves, comments } from '@/db';
import { desc, eq, and, sql, inArray } from 'drizzle-orm';
import { Flame, Eye, MessageCircle, TrendingUp } from 'lucide-react';

export const runtime = 'nodejs'; // EdgeOne 需要显式声明 · 否则可能跑 Edge runtime 而 postgres-js 不兼容

export const revalidate = 3600; // 每小时刷一次

type Row = {
  id: string;
  targetType: 'article' | 'teardown' | 'daily_pick';
  title: string;
  href: string;
  emoji: string;
  likes: number;
  saves: number;
  views: number;
  comments: number;
  score: number; // 综合分:likes*3 + saves*5 + comments*4 + views*0.1
};

async function loadLeaderboard(): Promise<Row[]> {
  // 一次拉全量已发布的三种内容
  const [aList, tList, pList] = await Promise.all([
    db.select({ id: articles.id, title: articles.title, slug: articles.slug, viewCount: articles.viewCount })
      .from(articles).where(eq(articles.isDraft, false)).limit(500),
    db.select({ id: teardowns.id, title: teardowns.title, slug: teardowns.slug, viewCount: teardowns.viewCount })
      .from(teardowns).limit(500),
    db.select({ id: dailyPicks.id, title: dailyPicks.name })
      .from(dailyPicks).where(eq(dailyPicks.isDraft, false)).limit(500),
  ]);

  // 聚合 likes / saves / comments · 按 targetType+targetId 分组
  const aggregate = async (target: string, table: any) => {
    const rows = await db
      .select({ targetId: table.targetId, n: sql<number>`count(*)::int` })
      .from(table)
      .where(eq(table.targetType, target))
      .groupBy(table.targetId);
    return new Map(rows.map((r: any) => [r.targetId, r.n]));
  };

  const [likeA, likeT, likeP, saveA, saveT, saveP, cmtA, cmtT, cmtP] = await Promise.all([
    aggregate('article', likes), aggregate('teardown', likes), aggregate('daily_pick', likes),
    aggregate('article', saves), aggregate('teardown', saves), aggregate('daily_pick', saves),
    aggregate('article', comments), aggregate('teardown', comments), aggregate('daily_pick', comments),
  ]);

  const mkRow = (
    id: string,
    targetType: 'article' | 'teardown' | 'daily_pick',
    title: string,
    href: string,
    emoji: string,
    viewCount: number,
    likeMap: Map<string, number>,
    saveMap: Map<string, number>,
    cmtMap: Map<string, number>,
  ): Row => {
    const l = likeMap.get(id) || 0;
    const s = saveMap.get(id) || 0;
    const c = cmtMap.get(id) || 0;
    const v = viewCount || 0;
    return {
      id, targetType, title, href, emoji,
      likes: l, saves: s, views: v, comments: c,
      score: l * 3 + s * 5 + c * 4 + v * 0.1,
    };
  };

  const rows: Row[] = [
    ...aList.map((a) => mkRow(a.id, 'article', a.title, `/insights/${a.slug}`, '✍️', a.viewCount || 0, likeA, saveA, cmtA)),
    ...tList.map((t) => mkRow(t.id, 'teardown', t.title, `/teardowns/${t.slug}`, '🔬', t.viewCount || 0, likeT, saveT, cmtT)),
    ...pList.map((p) => mkRow(p.id, 'daily_pick', p.title, `/#daily-picks`, '🌟', 0, likeP, saveP, cmtP)),
  ];

  return rows;
}

export default async function LeaderboardPage() {
  const all = await loadLeaderboard();

  const hot     = [...all].sort((a, b) => b.score - a.score).slice(0, 20);
  const viewed  = [...all].sort((a, b) => b.views - a.views).slice(0, 20).filter((r) => r.views > 0);
  const talked  = [...all].sort((a, b) => b.comments - a.comments).slice(0, 20).filter((r) => r.comments > 0);

  return (
    <div className="container max-w-5xl py-12 pb-24">
      <div className="mb-10">
        <div className="text-[10px] font-black tracking-[2px] uppercase text-coral mb-2">Leaderboard · 内容排行</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-[-0.03em] leading-[1.1] mb-3">
          什么<em className="accent">最受欢迎</em>
        </h1>
        <p className="text-ink-soft leading-relaxed max-w-2xl">
          综合 <b>点赞 · 收藏 · 评论 · 阅读</b> 4 项指标 · 跨越洞察长文 · 产品拆解 · 每日精选 3 类内容 · 每小时刷新一次。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Board icon={<Flame className="w-4 h-4" />} title="综合最热" tint="text-coral" rows={hot} metric="score" />
        <Board icon={<Eye className="w-4 h-4" />} title="阅读最多" tint="text-blue-600" rows={viewed} metric="views" />
        <Board icon={<MessageCircle className="w-4 h-4" />} title="讨论最多" tint="text-teal-600" rows={talked} metric="comments" />
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        评分公式:<code className="font-mono">score = likes×3 + saves×5 + comments×4 + views×0.1</code>
      </p>
    </div>
  );
}

function Board({
  icon, title, tint, rows, metric,
}: {
  icon: React.ReactNode; title: string; tint: string;
  rows: Row[]; metric: 'score' | 'views' | 'comments';
}) {
  return (
    <section className="bg-cream border-2 border-ink rounded-2xl p-5 shadow-brutal-sm">
      <div className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest mb-4 ${tint}`}>
        {icon} {title}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          还没有数据 · 等你的用户产生互动
        </div>
      ) : (
        <ol className="space-y-1">
          {rows.slice(0, 10).map((r, i) => (
            <li key={r.id}>
              <Link
                href={r.href}
                className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-bg-alt group transition"
              >
                <span className={`w-6 text-center font-serif font-black text-lg leading-none ${
                  i === 0 ? 'text-coral' : i === 1 ? 'text-amber-600' : i === 2 ? 'text-yellow-700' : 'text-muted-foreground'
                }`}>
                  {i + 1}
                </span>
                <span className="text-lg flex-shrink-0">{r.emoji}</span>
                <span className="text-sm font-bold truncate min-w-0 flex-1 group-hover:text-coral">
                  {r.title}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">
                  {metric === 'score'    && <>♨ {Math.round(r.score)}</>}
                  {metric === 'views'    && <>👁 {r.views}</>}
                  {metric === 'comments' && <>💬 {r.comments}</>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
