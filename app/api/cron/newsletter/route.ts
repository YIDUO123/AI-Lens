/**
 * 每周 Newsletter 自动组稿 + 发送
 * 触发方式:
 *   GET /api/cron/newsletter · 需带 CRON_SECRET 或从 Vercel Cron 内部
 * 抓取本周(过去 7 天)的:
 *   - 已发布洞察长文 · 最多 5 篇
 *   - 已发布产品拆解 · 最多 3 篇
 *   - 已发布每日精选 · 最多 5 条
 * 用 Resend 一封一封发(带个人化 unsubscribe token)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, articles, teardowns, dailyPicks, newsletterSubscribers } from '@/db';
import { desc, eq, and, gte } from 'drizzle-orm';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function authOK(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 没配就允许(方便本地/首次测试)
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authOK(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY 未配置' }, { status: 500 });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-lens-six.vercel.app';

  // 组稿
  const [freshArticles, freshTeardowns, freshPicks, subs] = await Promise.all([
    db.select({ id: articles.id, slug: articles.slug, title: articles.title, excerpt: articles.excerpt, category: articles.category })
      .from(articles)
      .where(and(eq(articles.isDraft, false), gte(articles.publishedAt, oneWeekAgo)))
      .orderBy(desc(articles.publishedAt))
      .limit(5),
    db.select({ id: teardowns.id, slug: teardowns.slug, title: teardowns.title, positioning: teardowns.positioning })
      .from(teardowns)
      .where(gte(teardowns.publishedAt, oneWeekAgo))
      .orderBy(desc(teardowns.publishedAt))
      .limit(3),
    db.select({ id: dailyPicks.id, name: dailyPicks.name, tagline: dailyPicks.tagline, url: dailyPicks.url, category: dailyPicks.category })
      .from(dailyPicks)
      .where(and(eq(dailyPicks.isDraft, false), gte(dailyPicks.pickedAt, oneWeekAgo)))
      .orderBy(desc(dailyPicks.pickedAt))
      .limit(5),
    db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.active, true)),
  ]);

  if (subs.length === 0) {
    return NextResponse.json({ ok: true, message: '没有订阅者 · 不发信', stats: { subs: 0 } });
  }

  const hasContent = freshArticles.length + freshTeardowns.length + freshPicks.length;
  if (hasContent === 0) {
    return NextResponse.json({ ok: true, message: '本周无新内容 · 跳过发信', stats: { subs: subs.length } });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromAddr = process.env.NEWSLETTER_FROM || 'AI Lens <onboarding@resend.dev>';
  const subject = `AI Lens 周报 · ${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`;

  let sent = 0, failed = 0;
  const errors: string[] = [];

  for (const s of subs) {
    const html = renderEmail({
      articles: freshArticles,
      teardowns: freshTeardowns,
      picks: freshPicks,
      siteUrl,
      unsubscribeUrl: `${siteUrl}/api/newsletter/unsubscribe?token=${s.unsubscribeToken}`,
    });

    try {
      const { error } = await resend.emails.send({
        from: fromAddr,
        to: s.email,
        subject,
        html,
      });
      if (error) { failed++; errors.push(`${s.email}: ${error.message}`); }
      else { sent++; }
    } catch (e: any) {
      failed++;
      errors.push(`${s.email}: ${e.message}`);
    }

    // 更新最后发送时间
    await db
      .update(newsletterSubscribers)
      .set({ lastSentAt: new Date() })
      .where(eq(newsletterSubscribers.id, s.id));
  }

  return NextResponse.json({
    ok: true,
    stats: { subs: subs.length, sent, failed, articles: freshArticles.length, teardowns: freshTeardowns.length, picks: freshPicks.length },
    errors: errors.slice(0, 5),
  });
}

// ---------------- 邮件 HTML 模板(inline CSS · 邮件客户端不吃 tailwind)----------------
function renderEmail(d: {
  articles: any[]; teardowns: any[]; picks: any[];
  siteUrl: string; unsubscribeUrl: string;
}) {
  const CAT_LABEL: Record<string, string> = {
    thinking: '思考', 'hands-on': '实操', method: '方法', industry: '行业',
  };
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin: 0; padding: 0; background: #fefaf3; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif; color: #1a1a1a; line-height: 1.6; }
  .wrap { max-width: 600px; margin: 0 auto; padding: 30px 24px; }
  .brand { font-size: 12px; font-weight: 900; letter-spacing: 3px; color: #ff6b35; text-transform: uppercase; }
  .title { font-size: 28px; font-weight: 900; margin: 8px 0 6px; letter-spacing: -0.5px; }
  .date { font-size: 13px; color: #999; margin-bottom: 28px; }
  .section-label { font-size: 11px; font-weight: 900; letter-spacing: 2px; color: #ff6b35; text-transform: uppercase; margin: 32px 0 12px; }
  .card { display: block; background: #fff; border: 2px solid #1a1a1a; border-radius: 12px; padding: 16px 18px; text-decoration: none; color: #1a1a1a; margin-bottom: 10px; }
  .card h3 { font-size: 16px; font-weight: 800; margin: 0 0 6px; }
  .card p { font-size: 13px; color: #666; margin: 0; }
  .tag { display: inline-block; background: #fef3ec; color: #ff6b35; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-right: 6px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px dashed #ddd; font-size: 12px; color: #999; text-align: center; }
  .footer a { color: #ff6b35; text-decoration: none; }
</style></head>
<body><div class="wrap">
  <div class="brand">AI Lens · Weekly</div>
  <h1 class="title">本周精选</h1>
  <div class="date">${dateStr}</div>

  ${d.articles.length ? `
  <div class="section-label">✍️ 洞察长文</div>
  ${d.articles.map((a) => `
    <a class="card" href="${d.siteUrl}/insights/${a.slug}">
      <div><span class="tag">${CAT_LABEL[a.category] || a.category}</span></div>
      <h3>${escape(a.title)}</h3>
      ${a.excerpt ? `<p>${escape(a.excerpt).slice(0, 140)}</p>` : ''}
    </a>
  `).join('')}
  ` : ''}

  ${d.teardowns.length ? `
  <div class="section-label">🔬 产品拆解</div>
  ${d.teardowns.map((t) => `
    <a class="card" href="${d.siteUrl}/teardowns/${t.slug}">
      <h3>${escape(t.title)}</h3>
      ${t.positioning ? `<p>${escape(t.positioning)}</p>` : ''}
    </a>
  `).join('')}
  ` : ''}

  ${d.picks.length ? `
  <div class="section-label">🌟 每日精选</div>
  ${d.picks.map((p) => `
    <a class="card" href="${p.url || d.siteUrl}">
      <div><span class="tag">${escape(p.category || '')}</span></div>
      <h3>${escape(p.name)}</h3>
      ${p.tagline ? `<p>${escape(p.tagline)}</p>` : ''}
    </a>
  `).join('')}
  ` : ''}

  <div class="footer">
    <p>你收到这封邮件是因为你订阅了 <a href="${d.siteUrl}">AI Lens</a> 的每周简报。</p>
    <p><a href="${d.unsubscribeUrl}">一键退订</a> · <a href="${d.siteUrl}">访问网站</a></p>
  </div>
</div></body></html>`;
}

function escape(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
