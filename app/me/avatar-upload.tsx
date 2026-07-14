'use client';

/**
 * 头像上传 · 点击当前头像 · 选文件 · 上传到 Vercel Blob · 更新用户 user.image
 * 200x200 客户端压缩(Canvas)· 减小体积
 */
import { useRef, useState, useTransition } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { updateUserAvatar } from '@/lib/actions/user';

export function AvatarUpload({ currentImage, userName }: { currentImage: string | null; userName: string }) {
  const [preview, setPreview] = useState<string | null>(currentImage);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('只支持图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片太大 · 最多 5MB');
      return;
    }

    try {
      // 客户端 Canvas 压缩到 200x200
      const compressed = await compressToSquare(file, 200);
      // 先本地预览
      setPreview(URL.createObjectURL(compressed));

      // 上传到 /api/upload
      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.append('file', compressed, `avatar-${Date.now()}.png`);
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

          // 更新 user.image
          await updateUserAvatar(data.url);
          // 完事 · 刷新一次(用 window · 避免 EdgeOne RSC 坑)
          window.location.reload();
        } catch (err: any) {
          setError('上传失败:' + err.message);
          setPreview(currentImage);
        }
      });
    } catch (err: any) {
      setError('图片处理失败:' + err.message);
    }
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={pending}
        className="block w-20 h-20 rounded-full overflow-hidden border-2 border-ink relative group-hover:ring-4 group-hover:ring-coral/40 transition"
        title="点击更换头像"
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-coral to-gold grid place-items-center text-white font-black text-3xl">
            {userName?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        {/* 悬浮遮罩 */}
        <div className={`absolute inset-0 bg-black/50 grid place-items-center transition ${pending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {pending ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      {error && (
        <div className="absolute top-full mt-1 left-0 right-0 text-[10px] text-red-600 whitespace-nowrap">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

/**
 * Canvas 压缩到方形指定边长 · 保持中心裁剪 · 输出 PNG
 */
async function compressToSquare(file: File, size: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('无法创建 canvas'));
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('压缩失败'));
        resolve(new File([blob], 'avatar.png', { type: 'image/png' }));
      }, 'image/png', 0.9);
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = url;
  });
}
