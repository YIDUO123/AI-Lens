/**
 * POST /api/upload
 * 编辑器图片粘贴/拖拽上传 · 存 Vercel Blob · 返回公开 URL
 * 只允许 admin / editor
 */
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const role = (session.user as any).role || 'reader';
  if (role !== 'admin' && role !== 'editor') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: '未配置 BLOB_READ_WRITE_TOKEN · 请在 Vercel Storage 里创建一个 Blob store' },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '没收到文件' }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: `文件类型不支持: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `文件太大(超 ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 400 });
  }

  const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'png').toLowerCase();
  const key = `insights/${new Date().toISOString().slice(0, 7)}/${nanoid(10)}.${ext}`;

  const blob = await put(key, file, {
    access: 'public',
    addRandomSuffix: false,
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url, size: file.size });
}
