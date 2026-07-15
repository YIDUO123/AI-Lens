/**
 * 埋点核心 · 3 写入通道 · 全部 fire-and-forget · 永不阻塞主流程
 *
 * 通道:
 *   1. DB(权威源)· 生产环境查报表用
 *   2. 本地文件 · analytics_events.log · dev 快速肉眼查(生产大概率写不进 · 静默 fail)
 *   3. console · 生产在 Vercel Runtime Logs 里可看
 *
 * 使用:
 *   服务端 → logEvent('newsletter_subscribe', { source: 'home' })
 *   服务端 → logAiCall({ useCase, provider, success, durationMs, ... })
 *
 * 客户端调用见 lib/analytics/track-client.ts
 */
import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import { db, aiCallLogs, userEvents } from '@/db';

const LOG_FILE = path.join(process.cwd(), 'analytics_events.log');

// ============================================================
// 内部:写本地文件(dev 用 · 生产静默失败)
// ============================================================
async function writeFileLine(payload: Record<string, unknown>) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...payload }) + '\n';
    // fs.appendFile 原子追加 · ndjson 每行独立 · 多进程写不会撕行
    await fs.appendFile(LOG_FILE, line, 'utf8');
  } catch {
    // Vercel 生产 · cwd 只读 · 直接静默(生产权威源在 DB)
  }
}

// ============================================================
// 内部:控制台(生产在 Vercel Runtime Logs 里可查)
// ============================================================
function writeConsole(name: string, payload: Record<string, unknown>) {
  try {
    // 只在非生产 · 或用户显式打开 debug 时 · 输出
    if (process.env.NODE_ENV !== 'production' || process.env.ANALYTICS_DEBUG === '1') {
      // eslint-disable-next-line no-console
      console.log(`[analytics] ${name}`, payload);
    }
  } catch {}
}

// ============================================================
// 公共:记录一条通用事件
// ============================================================
export type EventProps = Record<string, string | number | boolean | null | undefined>;

export function logEvent(
  eventName: string,
  props: EventProps = {},
  ctx?: { userId?: string | null; sessionId?: string | null; path?: string | null },
): void {
  // ⚠️ 不 await · 不 return promise · 埋点永远不阻塞主流程
  const id = nanoid();
  const cleanProps = cleanupProps(props);
  const record = {
    event: eventName,
    props: cleanProps,
    user_id: ctx?.userId || null,
    session_id: ctx?.sessionId || null,
    path: ctx?.path || null,
  };

  writeConsole(eventName, record);
  writeFileLine(record).catch(() => {});

  db.insert(userEvents).values({
    id,
    eventName,
    props: cleanProps,
    userId: ctx?.userId || null,
    sessionId: ctx?.sessionId || null,
    path: ctx?.path || null,
  }).catch(() => {
    // DB 失败也吞掉 · 主流程无感
  });
}

// ============================================================
// 公共:记录一条 AI 调用日志
// ============================================================
export function logAiCall(entry: {
  useCase: string;
  provider: string;
  success: boolean;
  attemptsCount?: number;
  durationMs: number;
  inputLength?: number;
  outputLength?: number;
  errorCode?: string | null;
}): void {
  const id = nanoid();
  const row = {
    id,
    useCase: entry.useCase.slice(0, 50),
    provider: entry.provider.slice(0, 20),
    success: entry.success,
    attemptsCount: entry.attemptsCount ?? 1,
    durationMs: Math.max(0, Math.round(entry.durationMs)),
    inputLength: Math.max(0, entry.inputLength ?? 0),
    outputLength: Math.max(0, entry.outputLength ?? 0),
    errorCode: entry.errorCode?.slice(0, 200) || null,
  };

  writeConsole('ai_call', row);
  writeFileLine({ event: 'ai_call', ...row }).catch(() => {});

  db.insert(aiCallLogs).values(row).catch(() => {});
}

// ============================================================
// 工具:hash 一段字符串(搜索 query 脱敏用 · 前 12 字符)
// ============================================================
export function hashString(s: string): string {
  if (!s) return '';
  return createHash('sha256').update(s.toLowerCase().trim()).digest('hex').slice(0, 12);
}

// ============================================================
// 工具:清理 props · 限制单条大小 · 剔除敏感字段
// ============================================================
function cleanupProps(props: EventProps): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  let bytes = 0;
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    // 禁字段:任何看着像 PII 的
    if (/email|password|token|secret|ip|api[_-]?key/i.test(k)) continue;
    const key = k.slice(0, 40);
    let val: string | number | boolean = v as any;
    if (typeof val === 'string') val = val.slice(0, 500);
    // 一条 props 总字节数上限 · 2 KB
    bytes += (key.length + String(val).length);
    if (bytes > 2000) break;
    out[key] = val;
  }
  return out;
}
