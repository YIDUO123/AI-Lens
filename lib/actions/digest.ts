'use server';

/**
 * 每日精编 · 订阅偏好 Server Actions
 * - 登录用户:按 userId 绑定,可在 /me 管理
 * - 邮箱订阅者:按 email 绑定
 * 统一写进 newsletterSubscribers(preferences / erp / feishuId)
 */
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, newsletterSubscribers } from '@/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logEvent } from '@/lib/analytics/log';
import { sendFeishuWebhook } from '@/lib/channels/feishu';
import type { DigestPreferences } from '@/db';
import { DEFAULT_DIGEST_PREFERENCES } from '@/db';

const VALID_MODULES = ['ai-models', 'ai-products', 'industry', 'paper', 'tip'];
const VALID_CHANNELS = ['email', 'feishu', 'jdme'] as const;
const VALID_TIMES = ['07:00', '08:00', '09:00', '12:00', '18:00', '21:00'];

function sanitize(input: Partial<DigestPreferences>): DigestPreferences {
  const d = DEFAULT_DIGEST_PREFERENCES;
  const modules = Array.isArray(input.modules) ? input.modules.filter((m) => VALID_MODULES.includes(m)).slice(0, 5) : d.modules;
  const models = Array.isArray(input.models) ? input.models.map((m) => String(m).toLowerCase().trim()).filter(Boolean).slice(0, 10) : d.models;
  const channels = Array.isArray(input.channels) ? input.channels.filter((c) => (VALID_CHANNELS as readonly string[]).includes(c)) as DigestPreferences['channels'] : d.channels;
  const sendTime = VALID_TIMES.includes(input.sendTime || '') ? input.sendTime! : d.sendTime;
  const format = ['brief', 'cards', 'both'].includes(input.format || '') ? input.format! : d.format;
  const frequency = input.frequency === 'weekly' ? 'weekly' : 'daily';
  return { modules, models, channels: channels.length ? channels : ['email'], sendTime, format, frequency };
}

/** 登录用户读自己的偏好(没有则返回默认 + 未订阅标记) */
export async function getMyDigestPreferences(): Promise<{ subscribed: boolean; prefs: DigestPreferences; email: string | null; erp: string | null; feishuId: string | null; feishuWebhook: string | null }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { subscribed: false, prefs: DEFAULT_DIGEST_PREFERENCES, email: null, erp: null, feishuId: null, feishuWebhook: null };

  const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.userId, session.user.id)).limit(1);
  if (row) {
    return { subscribed: row.active, prefs: row.preferences || DEFAULT_DIGEST_PREFERENCES, email: row.email, erp: row.erp, feishuId: row.feishuId, feishuWebhook: row.feishuWebhook };
  }
  return { subscribed: false, prefs: { ...DEFAULT_DIGEST_PREFERENCES }, email: session.user.email || null, erp: null, feishuId: null, feishuWebhook: null };
}

/**
 * 保存偏好(登录用户)· upsert
 * 渠道选了 jdme 必须有 erp;选了 feishu 建议有 feishuId(没有则走群 webhook 兜底)
 */
export async function saveDigestPreferences(
  input: Partial<DigestPreferences>,
  extra?: { erp?: string; feishuId?: string; feishuWebhook?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: '请先登录' };

  const prefs = sanitize(input);
  const erp = (extra?.erp || '').trim().slice(0, 64) || null;
  const feishuId = (extra?.feishuId || '').trim().slice(0, 128) || null;
  const feishuWebhook = (extra?.feishuWebhook || '').trim().slice(0, 300) || null;

  if (prefs.channels.includes('jdme') && !erp) {
    return { ok: false, error: '选择京me 推送需要填写 ERP 账号' };
  }
  if (prefs.channels.includes('feishu') && !feishuWebhook) {
    return { ok: false, error: '选择飞书推送需要粘贴群机器人 Webhook URL' };
  }
  if (feishuWebhook && !/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\//.test(feishuWebhook)) {
    return { ok: false, error: '飞书 Webhook 格式不对(应以 https://open.feishu.cn/open-apis/bot/v2/hook/ 开头)' };
  }

  const email = session.user.email;
  if (!email) return { ok: false, error: '账号没有邮箱' };

  const [existing] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.userId, session.user.id)).limit(1);

  if (existing) {
    await db.update(newsletterSubscribers)
      .set({ preferences: prefs, erp, feishuId, feishuWebhook, active: true })
      .where(eq(newsletterSubscribers.id, existing.id));
  } else {
    // email 可能已被"纯邮箱订阅"占用 → 复用那条并挂上 userId
    const [byEmail] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1);
    if (byEmail) {
      await db.update(newsletterSubscribers)
        .set({ userId: session.user.id, preferences: prefs, erp, feishuId, feishuWebhook, active: true })
        .where(eq(newsletterSubscribers.id, byEmail.id));
    } else {
      await db.insert(newsletterSubscribers).values({
        id: nanoid(),
        email,
        unsubscribeToken: nanoid(32),
        source: 'digest-me',
        userId: session.user.id,
        preferences: prefs,
        erp,
        feishuId,
        feishuWebhook,
        active: true,
        verified: true,
      });
    }
  }

  logEvent('digest_prefs_save', { modules: prefs.modules.length, models: prefs.models.length, channels: prefs.channels.join(','), sendTime: prefs.sendTime }, { userId: session.user.id, path: '/me' });
  return { ok: true };
}

/** 关闭每日精编(不删记录,frequency 置空使 cron 跳过) */
export async function pauseDigest(): Promise<{ ok: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false };
  const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.userId, session.user.id)).limit(1);
  if (row) {
    const prefs = { ...(row.preferences || DEFAULT_DIGEST_PREFERENCES), frequency: 'weekly' as const };
    await db.update(newsletterSubscribers).set({ preferences: prefs }).where(eq(newsletterSubscribers.id, row.id));
  }
  return { ok: true };
}

/** 发送一条测试消息到用户粘的飞书群 webhook · 当场验证配置 */
export async function testFeishuWebhook(url: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: '请先登录' };
  const u = (url || '').trim();
  if (!/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\//.test(u)) {
    return { ok: false, error: 'Webhook 格式不对' };
  }
  try {
    await sendFeishuWebhook(
      'AI Lens · 飞书推送测试 ✅\n收到这条就说明配置成功,明天起每天的 AI 精编会推到这个群。',
      u,
    );
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
