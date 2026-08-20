/**
 * 渠道分发层 · sendVia(channel, subscriber, payload)
 * 屏蔽各渠道差异,cron 只管构造内容,发送交给这里。
 *
 * - email:  Resend(已配)· 富 HTML
 * - jdme:   京ME 机器人 OpenAPI · 纯文本(需 ERP 绑定)
 * - feishu: webhook / 应用 1:1 · 纯文本(需 openid 或群 webhook)
 */
import { Resend } from 'resend';
import { sendJdmeToErp, sendJdmeToGroup, sendJdmeCard, jdmeConfigured, jdmeCardTemplateId } from './jdme';
import { sendFeishuToUser, sendFeishuWebhook } from './feishu';
import type { NewsletterSubscriber } from '@/db';

export type ChannelPayload = {
  subject: string;   // 邮件标题
  html: string;      // 邮件正文(email 用)
  text: string;      // 纯文本正文(jdme/feishu 用)
  cardData?: Record<string, any>; // 京ME 卡片模板变量(配了模板才用)
};

export type SendResult = { channel: string; ok: boolean; error?: string; id?: string };

async function sendEmail(sub: NewsletterSubscriber, p: ChannelPayload): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) return { channel: 'email', ok: false, error: 'RESEND_API_KEY 未配置' };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.NEWSLETTER_FROM || 'AI Lens <onboarding@resend.dev>';
  try {
    const { data, error } = await resend.emails.send({ from, to: sub.email, subject: p.subject, html: p.html });
    if (error) return { channel: 'email', ok: false, error: error.message };
    return { channel: 'email', ok: true, id: data?.id };
  } catch (e: any) {
    return { channel: 'email', ok: false, error: e.message };
  }
}

async function sendJdme(sub: NewsletterSubscriber, p: ChannelPayload): Promise<SendResult> {
  if (!jdmeConfigured()) return { channel: 'jdme', ok: false, error: '京me 凭证未配置' };
  if (!sub.erp) return { channel: 'jdme', ok: false, error: '该用户未绑定 ERP' };
  try {
    const templateId = jdmeCardTemplateId();
    // 配了卡片模板 + 有卡片数据 → 发卡片(好看);否则发文本兜底
    if (templateId && p.cardData) {
      const { cardMsgId } = await sendJdmeCard({ erp: sub.erp }, { templateId, cardData: p.cardData, summary: p.subject });
      return { channel: 'jdme', ok: true, id: cardMsgId };
    }
    const { packetId } = await sendJdmeToErp(sub.erp, p.text);
    return { channel: 'jdme', ok: true, id: packetId };
  } catch (e: any) {
    return { channel: 'jdme', ok: false, error: e.message };
  }
}

async function sendFeishu(sub: NewsletterSubscriber, p: ChannelPayload): Promise<SendResult> {
  try {
    // 优先:用户自己粘的群机器人 webhook(自助,零配置)
    if (sub.feishuWebhook) {
      await sendFeishuWebhook(p.text, sub.feishuWebhook);
      return { channel: 'feishu', ok: true };
    }
    // 其次:应用 1:1(需 FEISHU_APP_ID/SECRET + open_id)
    if (sub.feishuId && (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET)) {
      await sendFeishuToUser(sub.feishuId, p.text, 'open_id');
      return { channel: 'feishu', ok: true };
    }
    // 兜底:全局群 webhook(管理员配的)
    if (process.env.FEISHU_WEBHOOK_URL) {
      await sendFeishuWebhook(p.text);
      return { channel: 'feishu', ok: true };
    }
    return { channel: 'feishu', ok: false, error: '未填写飞书群机器人 Webhook' };
  } catch (e: any) {
    return { channel: 'feishu', ok: false, error: e.message };
  }
}

/** 按订阅者偏好里的 channels,逐个渠道发送 · 返回每渠道结果 */
export async function sendToSubscriber(sub: NewsletterSubscriber, p: ChannelPayload): Promise<SendResult[]> {
  const channels = sub.preferences?.channels?.length ? sub.preferences.channels : ['email'];
  const results: SendResult[] = [];
  for (const ch of channels) {
    if (ch === 'email') results.push(await sendEmail(sub, p));
    else if (ch === 'jdme') results.push(await sendJdme(sub, p));
    else if (ch === 'feishu') results.push(await sendFeishu(sub, p));
  }
  return results;
}
