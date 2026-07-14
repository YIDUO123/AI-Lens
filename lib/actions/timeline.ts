'use server';

/**
 * 时间线 · CRUD Server Actions · 极简版
 * 只做 add + list + delete · 不需要 draft/publish 流程(时间线本身就是历史记录)
 */
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, timelineVersions } from '@/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath, revalidateTag } from 'next/cache';

async function requireEditor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('未登录');
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') throw new Error('无权限');
  return session.user;
}

export async function addTimelineVersion(input: {
  family: string;
  version: string;
  title: string;
  dateLabel: string;       // "2026.07"
  dateOrderDate: string;   // "2026-07-15"(ISO 日期串 · 服务端转 Date)
  breakthrough: boolean;
  changes: string[];       // 3-5 条变化点
  capability?: string;
  signal?: string;
}) {
  await requireEditor();

  if (!input.family || !['openai', 'anthropic', 'google', 'cursor', 'domestic'].includes(input.family)) {
    throw new Error('family 必须是 openai/anthropic/google/cursor/domestic 之一');
  }
  if (!input.version?.trim()) throw new Error('version 必填');
  if (!input.title?.trim()) throw new Error('title 必填');
  if (!input.dateLabel?.trim()) throw new Error('dateLabel 必填');
  if (!input.dateOrderDate) throw new Error('dateOrderDate 必填');

  const dateOrder = new Date(input.dateOrderDate);
  if (isNaN(dateOrder.getTime())) throw new Error('日期格式不对 · 用 YYYY-MM-DD');

  const cleanChanges = (input.changes || []).map((c) => (c || '').trim()).filter(Boolean).slice(0, 10);

  await db.insert(timelineVersions).values({
    id: nanoid(),
    family: input.family,
    version: input.version.slice(0, 100),
    title: input.title.slice(0, 200),
    dateLabel: input.dateLabel.slice(0, 20),
    dateOrder,
    breakthrough: input.breakthrough,
    changes: cleanChanges,
    capability: (input.capability || '').slice(0, 500) || null,
    signal: (input.signal || '').slice(0, 500) || null,
  });

  revalidateTag('timeline');
  revalidatePath('/timeline');
  revalidatePath('/admin/timeline');

  return { ok: true };
}

export async function deleteTimelineVersion(id: string) {
  await requireEditor();
  await db.delete(timelineVersions).where(eq(timelineVersions.id, id));
  revalidateTag('timeline');
  revalidatePath('/timeline');
  revalidatePath('/admin/timeline');
  return { ok: true };
}
