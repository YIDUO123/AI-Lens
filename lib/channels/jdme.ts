/**
 * 京ME · 机器人 OpenAPI 发送(服务端移植版)
 * 端点 / 鉴权流程按 ~/.claude/skills/jdme-send 移植,凭证走环境变量。
 *
 * ⚠️ 网络约束:默认 API_BASE 是京东内网 openme.jd.local,Vercel 海外节点访问不到。
 *    生产环境需:① 京ME 外网网关(改 JDME_API_BASE),或 ② 内网中继触发。
 *    见 lib/channels/README 说明。
 *
 * 环境变量:
 *   JDME_APP_KEY / JDME_APP_SECRET / JDME_OPEN_TEAM_ID / JDME_ROBOT_ID
 *   JDME_TENANT_ID   (可选,默认 CN.JD.GROUP)
 *   JDME_API_BASE    (可选,默认内网;外网时改这里)
 */

const API_BASE = process.env.JDME_API_BASE || 'http://openme.jd.local/open-api';
const TENANT = process.env.JDME_TENANT_ID || 'CN.JD.GROUP';

function creds() {
  const appKey = process.env.JDME_APP_KEY;
  const appSecret = process.env.JDME_APP_SECRET;
  const openTeamId = process.env.JDME_OPEN_TEAM_ID;
  const robotId = process.env.JDME_ROBOT_ID;
  if (!appKey || !appSecret || !openTeamId || !robotId) {
    throw new Error('京me 凭证未配置(JDME_APP_KEY / JDME_APP_SECRET / JDME_OPEN_TEAM_ID / JDME_ROBOT_ID)');
  }
  return { appKey, appSecret, openTeamId, robotId };
}

// ---- token 缓存(模块级 · 暖实例内复用,冷启动重取)----
let cache: { appToken?: string; appExp?: number; teamToken?: string; teamExp?: number } = {};

async function apiPost(path: string, body: any, bearer?: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (json?.code !== 0 && json?.code !== '0') {
    throw new Error(`京me API ${path} 失败:code=${json?.code} msg=${json?.msg || res.statusText}`);
  }
  return json;
}

async function getAppToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cache.appToken && cache.appExp && now < cache.appExp) return cache.appToken;
  const { appKey, appSecret } = creds();
  const json = await apiPost('/auth/v1/app_access_token', { appKey, appSecret });
  cache.appToken = json.data.appAccessToken;
  cache.appExp = now + (json.data.expireIn || 3600) - 60;
  return cache.appToken!;
}

async function getTeamToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cache.teamToken && cache.teamExp && now < cache.teamExp) return cache.teamToken;
  const appToken = await getAppToken();
  const { openTeamId } = creds();
  const json = await apiPost('/auth/v1/team_access_token', { appAccessToken: appToken, openTeamId });
  cache.teamToken = json.data.teamAccessToken;
  cache.teamExp = now + (json.data.expireIn || 3600) - 60;
  return cache.teamToken!;
}

/** 给一个 ERP 发文本 */
export async function sendJdmeToErp(erp: string, text: string): Promise<{ packetId?: string }> {
  const { appKey, robotId } = creds();
  const teamToken = await getTeamToken();
  const body = {
    appId: appKey,
    requestId: crypto.randomUUID(),
    dateTime: Date.now(),
    erp,
    tenantId: TENANT,
    params: { robotId, body: { type: 'text', content: text } },
  };
  const json = await apiPost('/suite/v1/timline/sendRobotMsg', body, teamToken);
  return { packetId: json?.data?.packetId };
}

/** 给一个咚咚群发文本 */
export async function sendJdmeToGroup(groupId: string, text: string): Promise<{ packetId?: string }> {
  const { appKey, robotId } = creds();
  const teamToken = await getTeamToken();
  const body = {
    appId: appKey,
    requestId: crypto.randomUUID(),
    dateTime: Date.now(),
    groupId,
    params: { robotId, body: { type: 'text', content: text } },
  };
  const json = await apiPost('/suite/v1/timline/sendRobotMsg', body, teamToken);
  return { packetId: json?.data?.packetId };
}

// ============================================================
// 互动卡片(sendJUEMsg)· 富文本/图片,比纯文本好看
// 前置:在京ME卡片平台(me.jd.com/openplatform)可视化搭一张模板,拿到 templateId,
//       模板变量名对应 cardData 的 key。未配 JDME_CARD_TEMPLATE_ID 时走文本兜底。
// ============================================================
export async function sendJdmeCard(
  target: { erp?: string; groupId?: string },
  opts: { templateId: string; cardData: Record<string, any>; summary?: string; widthMode?: 'compact' | 'standard' | 'wide' },
): Promise<{ cardMsgId?: string }> {
  const { appKey, robotId } = creds();
  const teamToken = await getTeamToken();
  const base: any = {
    appId: appKey,
    requestId: crypto.randomUUID(),
    dateTime: Date.now(),
    tenantId: TENANT,
    ...(target.groupId ? { groupId: target.groupId } : { erp: target.erp }),
  };
  const body = {
    ...base,
    params: {
      robotId,
      data: {
        templateId: opts.templateId,
        templateType: 1,
        width_mode: opts.widthMode || 'wide',
        reload: false,
        summary: opts.summary || '',
        cardData: opts.cardData,
        forward: { reload: false, cardData: opts.cardData },
      },
    },
  };
  const json = await apiPost('/suite/v1/timline/sendJUEMsg', body, teamToken);
  return { cardMsgId: json?.data?.cardMsgId };
}

export function jdmeConfigured(): boolean {
  return !!(process.env.JDME_APP_KEY && process.env.JDME_APP_SECRET && process.env.JDME_OPEN_TEAM_ID && process.env.JDME_ROBOT_ID);
}

/** 是否已配置卡片模板(配了才发卡片,否则发文本) */
export function jdmeCardTemplateId(): string | null {
  return process.env.JDME_CARD_TEMPLATE_ID || null;
}
