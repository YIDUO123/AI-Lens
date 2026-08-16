'use client';

/**
 * 打赏开关 · admin 后台
 * 关掉后全站不再展示打赏泡泡(路演/正式场合可临时关)。
 */
import { useState, useTransition } from 'react';
import { Coffee, Loader2 } from 'lucide-react';
import { setDonationEnabled } from '@/lib/actions/settings';

export function DonationToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [on, setOn] = useState(initialEnabled);
  const [pending, start] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next); // 乐观
    start(async () => {
      const r = await setDonationEnabled(next);
      if (!r.ok) setOn(!next); // 回滚
    });
  };

  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-line">
      <div className="flex items-center gap-2.5">
        <Coffee className="w-4 h-4 text-coral" />
        <div>
          <div className="text-sm font-bold">打赏泡泡</div>
          <div className="text-[11px] text-muted-foreground">{on ? '全站展示中' : '已隐藏'}</div>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        role="switch"
        aria-checked={on}
        className={`relative w-12 h-6 rounded-full border-2 border-ink transition ${on ? 'bg-coral' : 'bg-bg-alt'} disabled:opacity-60`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white border border-ink transition-transform ${on ? 'translate-x-6' : ''}`}>
          {pending && <Loader2 className="w-3 h-3 animate-spin absolute inset-0 m-auto text-ink" />}
        </span>
      </button>
    </div>
  );
}
