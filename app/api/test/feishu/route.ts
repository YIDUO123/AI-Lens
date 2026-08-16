/**
 * 飞书发送 · 测试端点
 * GET /api/test/feishu?token=<CRON_SECRET>&text=你好
 *   - 默认走 FEISHU_WEBHOOK_URL(群机器人)
 *   - ?webhook=<url>  临时覆盖 webhook(不写 env 也能测)
 *   - ?openid=<ou_x>  改走应用 1:1(需 FEISHU_APP_ID/SECRET)
 * 用于「先跑通飞书」:配好 webhook 后一键验证能不能收到消息。
 */
import { NextRequest, NextResponse } from 'next/server';
import { sendFeishuWebhook, sendFeishuToUser, feishuConfigured } from '@/lib/channels/feishu';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const text = u.searchParams.get('text') || 'AI Lens · 飞书渠道测试 ✅ 如果你看到这条消息,说明飞书推送已跑通。';
  const webhook = u.searchParams.get('webhook') || undefined;
  const openid = u.searchParams.get('openid') || undefined;

  try {
    if (openid) {
      await sendFeishuToUser(openid, text, 'open_id');
      return NextResponse.json({ ok: true, mode: 'app_1v1', openid });
    }
    if (!webhook && !feishuConfigured()) {
      return NextResponse.json({ ok: false, error: '未配置飞书:设置 FEISHU_WEBHOOK_URL 或传 ?webhook= 参数' }, { status: 400 });
    }
    await sendFeishuWebhook(text, webhook);
    return NextResponse.json({ ok: true, mode: 'webhook', usedOverride: !!webhook });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
