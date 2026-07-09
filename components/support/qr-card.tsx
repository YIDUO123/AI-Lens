'use client';

import { useState } from 'react';

/**
 * 二维码卡片:如果 /public 下有对应 png 就显示,否则显示占位提示
 * 用 next/image 或原生 img 都行 — 这里用原生 img 以简化
 */
export function QrCard({
  title,
  subtitle,
  qrPath,
  fallbackColor,
  fallbackIcon,
}: {
  title: string;
  subtitle: string;
  qrPath: string;
  fallbackColor: string;
  fallbackIcon: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm hover:-translate-y-1 hover:shadow-brutal transition">
      <div className="flex justify-between items-baseline mb-4">
        <h4 className="text-lg font-black tracking-tight">{title}</h4>
        <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">{subtitle}</span>
      </div>

      <div className="aspect-square bg-white border-2 border-ink rounded-xl overflow-hidden relative">
        {failed ? (
          <div className={`absolute inset-0 grid place-items-center bg-gradient-to-br ${fallbackColor} text-white p-6 text-center`}>
            <div>
              <div className="text-6xl mb-3">{fallbackIcon}</div>
              <p className="text-xs font-bold">
                上传 <code className="bg-white/20 px-1.5 py-0.5 rounded font-mono">{qrPath.replace('/', '')}</code>
              </p>
              <p className="text-[11px] mt-1 opacity-80">到 public/ 目录后自动显示</p>
            </div>
          </div>
        ) : (
          <img
            src={qrPath}
            alt={`${title} QR`}
            className="w-full h-full object-contain p-2"
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  );
}
