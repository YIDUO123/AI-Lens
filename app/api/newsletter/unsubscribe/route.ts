/**
 * 一键退订 · 邮件底部链接指向这里
 * GET /api/newsletter/unsubscribe?token=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, newsletterSubscribers } from '@/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  if (!token) {
    return new NextResponse(page('退订失败', '缺少 token 参数'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 400,
    });
  }

  const [row] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribeToken, token))
    .limit(1);

  if (!row) {
    return new NextResponse(page('链接失效', '这条订阅可能已经退订或删除'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 404,
    });
  }

  await db
    .update(newsletterSubscribers)
    .set({ active: false })
    .where(eq(newsletterSubscribers.id, row.id));

  return new NextResponse(page('退订成功', `${row.email} 已从邮件列表移除 · 想改主意随时可以再订阅`), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function page(title: string, msg: string) {
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"/><title>${title} · AI Lens</title><style>
  body{font-family:-apple-system,sans-serif;background:#fefaf3;color:#1a1a1a;padding:60px 20px;max-width:520px;margin:0 auto;line-height:1.6}
  h1{font-size:28px;font-weight:900;margin-bottom:12px}
  p{color:#666;margin-bottom:24px}
  a{color:#ff6b35;font-weight:700;text-decoration:none}
  a:hover{text-decoration:underline}
  </style></head><body>
  <h1>${title}</h1><p>${msg}</p><a href="/">← 返回 AI Lens 首页</a>
  </body></html>`;
}
