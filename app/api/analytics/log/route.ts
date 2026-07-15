/**
 * POST /api/analytics/log
 * 客户端 track() 通过 sendBeacon / fetch 发到这里 · 写入 user_events 表
 *
 * 校验:
 *   - event 必填 · 长度 <= 60
 *   - props 若有 · 会经 cleanupProps 清洗(见 lib/analytics/log.ts)
 *   - session_id 可选
 *   - 用当前 session 拿 user_id(如已登录)
 * 永不返回具体错误 · 只回 { ok } · 避免探测
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logEvent } from '@/lib/analytics/log';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ ok: false });

    const eventName = String(body.event || '').trim().slice(0, 60);
    if (!eventName) return NextResponse.json({ ok: false });

    const props = (body.props && typeof body.props === 'object') ? body.props : {};
    const sessionId = body.session_id ? String(body.session_id).slice(0, 40) : null;
    const path = body.path ? String(body.path).slice(0, 200) : null;

    // 拿当前登录用户(不阻塞 · 拿不到就 null)
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      userId = session?.user?.id || null;
    } catch {}

    // fire-and-forget · logEvent 内部已经 try/catch
    logEvent(eventName, props, { userId, sessionId, path });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
