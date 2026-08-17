/**
 * 知识导出 · 给 JoyAgent(agent.jd.com)当知识库用
 * GET /api/export/knowledge?token=<CRON_SECRET>
 *   把最近的:资讯六维卡片 + 产品拆解 + 每日精选 聚合成干净 Markdown。
 *   JoyAgent「配置说明-知识」可上传 .md 或(若支持)填本 URL 定时同步。
 *
 * 参数:?days=3(资讯回溯天数,默认 3)· ?format=md|json(默认 md)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, newsItems, newsCards, teardowns, dailyPicks } from '@/db';
import { desc, gte, eq, and, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authOK(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const u = new URL(req.url);
  if (u.searchParams.get('token') === secret) return true;
  if ((req.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authOK(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const u = new URL(req.url);
  const days = Math.min(30, Math.max(1, parseInt(u.searchParams.get('days') || '3', 10) || 3));
  const asJson = u.searchParams.get('format') === 'json';
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // 资讯 + 六维卡片(有卡片的优先,信息密度高)
  const news = await db
    .select({ id: newsItems.id, title: newsItems.title, url: newsItems.url, source: newsItems.source, category: newsItems.category, publishedAt: newsItems.publishedAt })
    .from(newsItems)
    .where(gte(newsItems.publishedAt, since))
    .orderBy(desc(newsItems.score), desc(newsItems.publishedAt))
    .limit(60);
  const cardRows = news.length ? await db.select().from(newsCards).where(inArray(newsCards.id, news.map((n) => n.id))) : [];
  const cardMap = new Map(cardRows.map((c) => [c.id, c]));

  const tears = await db
    .select({ title: teardowns.title, positioning: teardowns.positioning, category: teardowns.category, body: teardowns.body, slug: teardowns.slug })
    .from(teardowns)
    .orderBy(desc(teardowns.publishedAt))
    .limit(20);

  const picks = await db
    .select({ name: dailyPicks.name, tagline: dailyPicks.tagline, url: dailyPicks.url, category: dailyPicks.category })
    .from(dailyPicks)
    .where(eq(dailyPicks.isDraft, false))
    .orderBy(desc(dailyPicks.pickedAt))
    .limit(20);

  const dateStr = new Date().toISOString().slice(0, 10);

  if (asJson) {
    return NextResponse.json({
      generatedAt: dateStr,
      news: news.map((n) => ({ ...n, card: cardMap.get(n.id) ? { tldr: cardMap.get(n.id)!.tldr, dims: cardMap.get(n.id)!.dims } : null })),
      teardowns: tears,
      picks,
    });
  }

  // ---- Markdown(供 JoyAgent 知识库)----
  const lines: string[] = [];
  lines.push(`# AI Lens 知识库 · ${dateStr}`);
  lines.push(`> 由 AI Lens(ailens.cloud)自动导出 · 覆盖最近 ${days} 天资讯 + 产品拆解 + 创投精选。`);
  lines.push(`> 用途:作为"AI Lens 情报官"智能体的知识来源。回答 AI 行业动向、产品对比、趋势判断时以此为准。\n`);

  lines.push(`\n## 一、近期 AI 资讯(含六维拆解)\n`);
  for (const n of news) {
    const c = cardMap.get(n.id);
    lines.push(`### ${n.title}`);
    lines.push(`- 来源:${n.source || '未知'} · 分类:${n.category || '-'} · 链接:${n.url || '-'}`);
    if (c) {
      const d = c.dims as any;
      lines.push(`- 一句话:${c.tldr}`);
      if (d?.overview) lines.push(`- 概览:${d.overview}`);
      if (d?.situation) lines.push(`- 情境(S):${d.situation}`);
      if (d?.task) lines.push(`- 焦点(T):${d.task}`);
      if (d?.action) lines.push(`- 行动(A):${d.action}`);
      if (d?.result) lines.push(`- 结果(R):${d.result}`);
      if (d?.takeaway) lines.push(`- 行动启示:${d.takeaway}`);
    }
    lines.push('');
  }

  lines.push(`\n## 二、产品深度拆解\n`);
  for (const t of tears) {
    lines.push(`### ${t.title}${t.positioning ? ` — ${t.positioning}` : ''}`);
    lines.push(`- 分类:${t.category} · 详情:ailens.cloud/teardowns/${t.slug}`);
    // 正文截断,控制知识库体积
    const body = (t.body || '').replace(/\n{2,}/g, '\n').slice(0, 1200);
    if (body) lines.push(body);
    lines.push('');
  }

  lines.push(`\n## 三、每日创投精选\n`);
  for (const p of picks) {
    lines.push(`- **${p.name}**（${p.category}）:${p.tagline || ''} ${p.url || ''}`);
  }

  const md = lines.join('\n');
  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `inline; filename="ai-lens-knowledge-${dateStr}.md"`,
    },
  });
}
