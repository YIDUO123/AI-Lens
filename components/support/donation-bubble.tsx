'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Coffee, X } from 'lucide-react';

// 不显示打赏泡泡的路由
const HIDDEN_PATHS = ['/support', '/sign-in', '/sign-up', '/admin'];

export function DonationBubble() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 会话内不再打扰(24 小时内不显示)
    try {
      const t = localStorage.getItem('ai-lens-tip-dismissed');
      if (t) {
        const ago = Date.now() - Number(t);
        if (ago < 24 * 60 * 60 * 1000) setDismissed(true);
      }
    } catch {}
  }, []);

  // 关闭 popup 时点击外部
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-donation-bubble]')) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  if (!mounted) return null;
  if (dismissed) return null;
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem('ai-lens-tip-dismissed', String(Date.now()));
    } catch {}
    setDismissed(true);
  };

  return (
    <div data-donation-bubble className="fixed bottom-6 right-6 z-40">
      {/* 弹出小卡 */}
      {open && (
        <div className="absolute bottom-16 right-0 w-[280px] bg-cream border-2 border-ink rounded-2xl p-4 shadow-brutal animate-[popup_0.22s_cubic-bezier(0.2,0.8,0.2,1)] origin-bottom-right">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] font-black tracking-widest uppercase text-coral">☕ Support</div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-full grid place-items-center text-ink-soft hover:bg-bg-alt"
              aria-label="关闭"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-base font-black mb-1 leading-tight">请我喝杯 <em className="accent">咖啡</em></div>
          <p className="text-[11px] text-ink-soft leading-relaxed mb-3">
            AI Lens 完全免费,如果你喜欢,请支持独立创作。
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniQr src="/qr-wechat.png" label="微信" fallback="💚" fallbackColor="from-green-500 to-green-600" />
            <MiniQr src="/qr-alipay.png" label="支付宝" fallback="💙" fallbackColor="from-blue-500 to-blue-600" />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-dashed border-line">
            <Link href="/support" onClick={() => setOpen(false)} className="text-[11px] font-bold text-coral hover:underline">
              查看详情 →
            </Link>
            <button
              onClick={handleDismiss}
              className="text-[10px] text-muted-foreground hover:text-ink underline"
            >
              24 小时内不再显示
            </button>
          </div>
        </div>
      )}

      {/* 泡泡本体 */}
      <button
        onClick={() => setOpen(!open)}
        className="group flex items-center gap-2 h-14 pl-4 pr-5 bg-gradient-to-br from-coral to-gold text-white border-2 border-ink rounded-full shadow-brutal hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#1a1a1a] transition-all"
        aria-label="打赏"
      >
        <Coffee className="w-5 h-5" />
        <span className="text-sm font-bold whitespace-nowrap">打赏</span>
      </button>

      <style>{`
        @keyframes popup {
          from { opacity: 0; transform: scale(0.85) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function MiniQr({ src, label, fallback, fallbackColor }: { src: string; label: string; fallback: string; fallbackColor: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="bg-white border border-line rounded-lg p-2 relative">
      <div className="aspect-square rounded overflow-hidden mb-1">
        {failed ? (
          <div className={`w-full h-full grid place-items-center bg-gradient-to-br ${fallbackColor} text-white text-2xl`}>
            {fallback}
          </div>
        ) : (
          <img
            src={src}
            alt={label}
            className="w-full h-full object-contain"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="text-[10px] text-center font-bold text-ink-soft">{label}</div>
    </div>
  );
}
