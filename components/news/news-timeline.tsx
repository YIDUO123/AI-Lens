/**
 * News Timeline · 按日期分组的完整时间线
 */
import { getLatestNews, getInteractionCountsBatch, getUserInteractions } from '@/lib/db/queries';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { LikeButton, SaveButton } from '@/components/interactions/reaction-buttons';

const PM_RULES = [
  { kw: ['agent', 'agents', '智能体', 'browser use', 'computer use'], insight: 'Agent 是当下最卷的赛道。核心问题:通用能力和垂直场景的平衡。' },
  { kw: ['open source', '开源'], insight: '开源策略通常服务于生态占位。看是社区驱动还是官方主导,策略截然不同。' },
  { kw: ['gpt', 'openai', 'claude', 'anthropic', 'gemini', 'grok'], insight: '头部大厂的动作是行业风向标,注意它是在开辟新场景还是补齐短板。' },
  { kw: ['api', 'sdk', 'developer'], insight: '面向开发者的产品,DX 就是留存核心 —— 别只看功能,看接入曲线。' },
  { kw: ['融资', 'funding', '估值'], insight: '融资信息背后是投资人对赛道的判断,现金流规模和融资节奏都是市场信号。' },
  { kw: ['pricing', '定价', 'subscription', '订阅'], insight: '定价策略变动往往对应 LTV/CAC 模型调整。' },
];

function pmInsight(title: string, summary: string | null): string | null {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  for (const rule of PM_RULES) {
    if (rule.kw.some((k) => text.includes(k))) return rule.insight;
  }
  return null;
}

function mapCatKey(raw: string | null): 'launch' | 'industry' | 'paper' | 'tip' {
  if (raw === 'ai-models' || raw === 'ai-products') return 'launch';
  if (raw === 'industry') return 'industry';
  if (raw === 'paper') return 'paper';
  return 'tip';
}

const CAT_STYLES = {
  launch:   { label: '模型 & 产品', bg: 'bg-coral text-white' },
  industry: { label: '行业动态',    bg: 'bg-ink text-white' },
  paper:    { label: '论文研究',    bg: 'bg-amber-700 text-white' },
  tip:      { label: '技巧观点',    bg: 'bg-teal text-white' },
};

function fmtTime(date: Date | string): string {
  const d = new Date(date);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function groupByDate(items: any[]) {
  const groups: Record<string, any[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const it of items) {
    const d = new Date(it.publishedAt);
    const key = d.toISOString().split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(it);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function dateLabel(dateStr: string): { label: string; meta: string } {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - day.getTime()) / 86400000);
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  if (diffDays === 0) return { label: '今天', meta: '周' + weekday };
  if (diffDays === 1) return { label: '昨天', meta: '周' + weekday };
  return { label: (d.getMonth() + 1) + '月' + d.getDate() + '日', meta: '周' + weekday };
}

function cleanSource(s: string | null): string {
  if (!s) return '';
  return s.replace(/\s*(?:（RSS）|\(RSS\))/g, '').replace(/^X[::]\s*/, '𝕏 ').trim();
}

export async function NewsTimeline({ activeCat }: { activeCat: string }) {
  const all = await getLatestNews(80);
  const filtered = activeCat === 'all' ? all : all.filter((n) => mapCatKey(n.category) === activeCat);

  if (filtered.length === 0) {
    return (
      <div className="mt-6 text-center py-16 border-2 border-dashed border-line rounded-xl">
        <h4 className="text-lg font-bold mb-2">暂无该分类下的内容</h4>
        <p className="text-sm text-muted-foreground">试试其他分类</p>
      </div>
    );
  }

  // 批量查赞/藏 + 用户交互状态(不影响时间排序)
  const session = await auth.api.getSession({ headers: await headers() });
  const currentUserId = session?.user?.id || null;
  const ids = filtered.map((n) => n.id);
  const [counts, userState] = await Promise.all([
    getInteractionCountsBatch('news_item', ids),
    currentUserId ? getUserInteractions(currentUserId, 'news_item', ids) : Promise.resolve({ likedIds: new Set<string>(), savedIds: new Set<string>() }),
  ]);

  const grouped = groupByDate(filtered);

  return (
    <div className="mt-6 space-y-10">
      {grouped.map(([dateKey, items]) => {
        const dl = dateLabel(items[0].publishedAt);
        return (
          <div key={dateKey}>
            <div className="flex items-center gap-3.5 mb-4 pb-2.5 border-b-2 border-dashed border-line">
              <span className="bg-ink text-background px-3 py-1 rounded text-sm font-black tracking-wide">{dl.label}</span>
              <span className="text-sm text-muted-foreground">{dl.meta} · {items.length} 条</span>
            </div>

            <div className="space-y-3.5">
              {items.map((it) => {
                const catKey = mapCatKey(it.category);
                const cat = CAT_STYLES[catKey];
                const insight = pmInsight(it.title, it.summary);
                const isHot = (it.score || 0) >= 75;
                const likes = counts.likes[it.id] || 0;
                const saves = counts.saves[it.id] || 0;
                const liked = userState.likedIds.has(it.id);
                const saved = userState.savedIds.has(it.id);
                return (
                  <article
                    key={it.id}
                    className="bg-cream border-2 border-ink rounded-xl px-5 py-4 grid grid-cols-[56px_1fr_auto] gap-4 items-start shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition"
                  >
                    <div className="font-mono text-sm font-bold text-coral tracking-tight">{fmtTime(it.publishedAt)}</div>

                    <div className="min-w-0">
                      <h3 className="text-base font-bold leading-snug mb-1.5">
                        <a href={it.url || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-coral">{it.title}</a>
                      </h3>
                      {it.summary && (
                        <p className="text-sm text-ink-soft leading-relaxed mb-2 line-clamp-2">{it.summary}</p>
                      )}
                      <div className="flex items-center gap-2.5 flex-wrap text-xs text-muted-foreground">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${cat.bg}`}>{cat.label}</span>
                        <span className="font-semibold">· {cleanSource(it.source)}</span>
                      </div>
                      {insight && (
                        <div className="mt-3 px-3.5 py-2.5 bg-orange-50 border-l-[3px] border-coral rounded-r-md text-[12.5px] leading-relaxed text-ink-soft">
                          <strong className="text-coral text-[10px] font-black tracking-widest uppercase mr-1.5">PM 视角</strong>
                          {insight}
                        </div>
                      )}

                      {/* 交互按钮 · 不影响排序 */}
                      <div className="flex items-center gap-1.5 mt-3">
                        <LikeButton
                          targetType="news_item"
                          targetId={it.id}
                          initialLiked={liked}
                          likeCount={likes}
                          isLoggedIn={!!currentUserId}
                          size="sm"
                          showCount
                          variant="ghost"
                        />
                        <SaveButton
                          targetType="news_item"
                          targetId={it.id}
                          initialSaved={saved}
                          saveCount={saves}
                          isLoggedIn={!!currentUserId}
                          size="sm"
                          showCount
                          variant="ghost"
                        />
                      </div>
                    </div>

                    <div
                      className={`flex flex-col items-center justify-center w-11 h-11 rounded-full border-2 border-ink text-sm font-black font-serif leading-none ${
                        isHot ? 'bg-coral text-white' : 'bg-bg-alt text-ink'
                      }`}
                    >
                      {it.score || '—'}
                      <span className="text-[7px] font-bold tracking-wide mt-0.5 opacity-70 font-sans">SCORE</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
