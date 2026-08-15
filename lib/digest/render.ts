/**
 * 每日精编 · 渲染
 * 把 DailyDigest(+六维卡片 TL;DR)渲染成:
 *   - renderDigestEmail() 富 HTML(邮件)
 *   - renderDigestText()  纯文本(京me / 飞书)
 * 分层阅读:这里只放 TL;DR + 链接,点进网页 /news/card/[id] 看完整六维。
 */
import type { DailyDigest, DigestItem } from '@/lib/fetchers/daily-digest';
import type { NewsCardDims } from '@/db';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || 'https://ailens.cloud';

const CAT_LABEL: Record<string, string> = {
  'ai-models': '🧠 模型', 'ai-products': '🚀 产品', industry: '📊 行业', paper: '📄 论文', tip: '💡 技巧',
};

export type EnrichedItem = DigestItem & { tldr?: string; dims?: NewsCardDims };

/** 把卡片 TL;DR 合进 digest items */
export function enrichItems(items: DigestItem[], cards: Map<string, { tldr: string; dims: NewsCardDims }>): EnrichedItem[] {
  return items.map((it) => {
    const c = cards.get(it.id);
    return { ...it, tldr: c?.tldr, dims: c?.dims };
  });
}

function cardUrl(id: string) { return `${SITE}/news/card/${id}`; }

function esc(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------- 纯文本(京me / 飞书)----------------
export function renderDigestText(items: EnrichedItem[], opts: { matched: number; date: string }): string {
  const lines: string[] = [];
  lines.push(`【AI Lens 每日精编 · ${opts.date}】`);
  lines.push(`今日 ${items.length} 条 · ${opts.matched} 条命中你的关注 · 花 5 分钟读懂今天的 AI`);
  lines.push('');
  items.forEach((it, i) => {
    const tldr = it.tldr || it.summary || it.title;
    lines.push(`${i + 1}. ${CAT_LABEL[it.category || ''] || ''} ${it.title}`);
    lines.push(`   ${tldr}`);
    lines.push(`   看六维拆解 → ${cardUrl(it.id)}`);
    lines.push('');
  });
  lines.push('———');
  lines.push(`调整偏好 / 退订 → ${SITE}/me`);
  return lines.join('\n');
}

// ---------------- 富 HTML(邮件)----------------
export function renderDigestEmail(items: EnrichedItem[], opts: { matched: number; date: string; unsubscribeUrl: string }): string {
  const top = items.slice(0, 3);
  const rest = items.slice(3);

  const topCards = top.map((it) => `
    <a class="card" href="${cardUrl(it.id)}">
      <div><span class="tag">${esc(CAT_LABEL[it.category || ''] || '资讯')}</span>${it.backfill ? '<span class="bf">为你补充</span>' : ''}</div>
      <h3>${esc(it.title)}</h3>
      <p>${esc(it.tldr || it.summary || '')}</p>
      <span class="more">查看六维拆解 →</span>
    </a>`).join('');

  const restList = rest.length ? `
    <div class="section-label">⚡ 快讯 · 点开看六维</div>
    ${rest.map((it, i) => `
      <a class="quick" href="${cardUrl(it.id)}">
        <span class="num">${i + 4}</span>
        <span class="qt">${esc(it.title)}</span>
      </a>`).join('')}` : '';

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;background:#fefaf3;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif;color:#1a1a1a;line-height:1.6}
  .wrap{max-width:600px;margin:0 auto;padding:30px 24px}
  .brand{font-size:12px;font-weight:900;letter-spacing:3px;color:#ff6b35;text-transform:uppercase}
  .title{font-size:26px;font-weight:900;margin:8px 0 4px;letter-spacing:-0.5px}
  .sub{font-size:13px;color:#888;margin-bottom:8px}
  .hint{font-size:12px;color:#ff6b35;font-weight:700;margin-bottom:24px}
  .section-label{font-size:11px;font-weight:900;letter-spacing:2px;color:#ff6b35;text-transform:uppercase;margin:28px 0 12px}
  .card{display:block;background:#fff;border:2px solid #1a1a1a;border-radius:12px;padding:16px 18px;text-decoration:none;color:#1a1a1a;margin-bottom:12px}
  .card h3{font-size:16px;font-weight:800;margin:6px 0 6px}
  .card p{font-size:13px;color:#555;margin:0 0 8px}
  .more{font-size:12px;font-weight:800;color:#ff6b35}
  .tag{display:inline-block;background:#fef3ec;color:#ff6b35;font-size:10px;font-weight:800;letter-spacing:1px;padding:2px 6px;border-radius:4px;margin-right:6px}
  .bf{display:inline-block;background:#eef;color:#556;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px}
  .quick{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px dashed #e5e0d5;text-decoration:none;color:#1a1a1a}
  .num{width:22px;height:22px;flex:none;background:#1a1a1a;color:#fff;border-radius:50%;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}
  .qt{font-size:14px;font-weight:600}
  .footer{margin-top:36px;padding-top:20px;border-top:1px dashed #ddd;font-size:12px;color:#999;text-align:center}
  .footer a{color:#ff6b35;text-decoration:none}
</style></head><body><div class="wrap">
  <div class="brand">AI Lens · Daily</div>
  <h1 class="title">今日 AI 精编</h1>
  <div class="sub">${opts.date} · 共 ${items.length} 条 · ${opts.matched} 条命中你的关注</div>
  <div class="hint">📖 5 分钟读懂,想深入就点开六维卡片</div>

  <div class="section-label">🔥 今日最该知道</div>
  ${topCards}
  ${restList}

  <div class="footer">
    <p>你订阅了 <a href="${SITE}">AI Lens</a> 每日精编。</p>
    <p><a href="${SITE}/me">调整偏好</a> · <a href="${opts.unsubscribeUrl}">退订</a></p>
  </div>
</div></body></html>`;
}
