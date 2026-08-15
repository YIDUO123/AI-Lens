/**
 * 渠道分发层 · sendVia(channel, subscriber, payload)
 * 屏蔽各渠道差异,cron 只管构造内容,发送交给这里。
 *
 * - email:  Resend(已配)· 富 HTML
 * - jdme:   京ME 机器人 OpenAPI · 纯文本(需 ERP 绑定)
 * - feishu: webhook / 应用 1:1 · 纯文本(需 openid 或群 webhook)
 */
import { Resend } from 'resend';
import { sendJdmeToErp, jdmeConfigured } from './jdme';
import { sendFeishuToUser, sendFeishuWebhook, feishuConfigured } from './feishu';
import type { NewsletterSubscriber } from '@/db';

export type ChannelPayload = {
  subject: string;   // 邮件标题
  html: string;      // 邮件正文(email 用)
  text: string;      // 纯文本正文(jdme/feishu 用)
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
    const { packetId } = await sendJdmeToErp(sub.erp, p.text);
    return { channel: 'jdme', ok: true, id: packetId };
  } catch (e: any) {
    return { channel: 'jdme', ok: false, error: e.message };
  }
}

async function sendFeishu(sub: NewsletterSubscriber, p: ChannelPayload): Promise<SendResult> {
  if (!feishuConfigured()) return { channel: 'feishu', ok: false, error: '飞书未配置' };
  try {
    if (sub.feishuId) {
      await sendFeishuToUser(sub.feishuId, p.text, 'open_id');
    } else if (process.env.FEISHU_WEBHOOK_URL) {
      await sendFeishuWebhook(p.text);
    } else {
      return { channel: 'feishu', ok: false, error: '该用户未绑定飞书 openid' };
    }
    return { channel: 'feishu', ok: true };
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
