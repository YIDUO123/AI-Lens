/**
 * 飞书 · 发送(先做形态 · API 接入简单,后续填 webhook/凭证即可)
 *
 * 两种模式:
 *  1. 群机器人 webhook(最简单 · 无需用户身份)· 配 FEISHU_WEBHOOK_URL 即可
 *  2. 应用 + openid 1:1 推送(需绑定用户 openid)· 走 tenant_access_token
 *
 * 环境变量:
 *   FEISHU_WEBHOOK_URL              群机器人 webhook(模式 1)
 *   FEISHU_APP_ID / FEISHU_APP_SECRET  应用凭证(模式 2)
 */

const OPEN_BASE = process.env.FEISHU_API_BASE || 'https://open.feishu.cn/open-apis';

/** 飞书自定义机器人「加签」· secret 存在时才算签名 */
async function feishuSign(secret: string, timestamp: number): Promise<string> {
  const { createHmac } = await import('crypto');
  // 飞书算法:key = `${timestamp}\n${secret}`,内容为空,HMAC-SHA256 后 base64
  const stringToSign = `${timestamp}\n${secret}`;
  return createHmac('sha256', stringToSign).update('').digest('base64');
}

/** 模式 1:群机器人 webhook 发文本(支持加签) */
export async function sendFeishuWebhook(text: string, webhookUrl?: string): Promise<void> {
  const url = webhookUrl || process.env.FEISHU_WEBHOOK_URL;
  if (!url) throw new Error('飞书 webhook 未配置(FEISHU_WEBHOOK_URL)');

  const payload: any = { msg_type: 'text', content: { text } };

  // 若配了加签 secret,带上 timestamp + sign(机器人开了签名校验时必需)
  const secret = process.env.FEISHU_WEBHOOK_SECRET;
  if (secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    payload.timestamp = String(timestamp);
    payload.sign = await feishuSign(secret, timestamp);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (json?.code !== 0 && json?.StatusCode !== 0) {
    throw new Error(`飞书 webhook 失败:${json?.msg || json?.StatusMessage || res.statusText}`);
  }
}

// ---- 模式 2:应用 token(1:1 推送用,后续接) ----
let tokenCache: { token?: string; exp?: number } = {};

async function tenantToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.exp && now < tokenCache.exp) return tokenCache.token;
  const app_id = process.env.FEISHU_APP_ID;
  const app_secret = process.env.FEISHU_APP_SECRET;
  if (!app_id || !app_secret) throw new Error('飞书应用凭证未配置(FEISHU_APP_ID / FEISHU_APP_SECRET)');
  const res = await fetch(`${OPEN_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id, app_secret }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`飞书 token 失败:${json.msg}`);
  tokenCache.token = json.tenant_access_token;
  tokenCache.exp = now + (json.expire || 7200) - 60;
  return tokenCache.token!;
}

/** 模式 2:给一个 open_id / user_id 发文本(1:1) */
export async function sendFeishuToUser(receiveId: string, text: string, idType: 'open_id' | 'user_id' | 'email' = 'open_id'): Promise<void> {
  const token = await tenantToken();
  const res = await fetch(`${OPEN_BASE}/im/v1/messages?receive_id_type=${idType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ receive_id: receiveId, msg_type: 'text', content: JSON.stringify({ text }) }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`飞书发送失败:${json.msg}`);
}

export function feishuConfigured(): boolean {
  return !!(process.env.FEISHU_WEBHOOK_URL || (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET));
}
