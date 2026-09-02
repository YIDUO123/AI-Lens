'use client';

/**
 * 模型追踪 · 家族切换共享状态
 * 左侧导航(桌面)与页内 tab(移动端/主内容)共用同一份 activeFam,
 * 切换纯客户端、零刷新;URL 用 replaceState 同步保证可分享
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

type FamilyCtx = {
  activeFam: string;
  setFam: (key: string) => void;
  counts: Record<string, number>;
};

const Ctx = createContext<FamilyCtx | null>(null);

export function FamilyStateProvider({
  initialFam,
  counts,
  children,
}: {
  initialFam: string;
  counts: Record<string, number>;
  children: ReactNode;
}) {
  const [activeFam, setActiveFam] = useState(initialFam);

  const setFam = (key: string) => {
    setActiveFam(key);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('fam', key);
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  return <Ctx.Provider value={{ activeFam, setFam, counts }}>{children}</Ctx.Provider>;
}

export function useFamilyState(): FamilyCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFamilyState must be used within FamilyStateProvider');
  return v;
}

/** 左侧家族导航(桌面端)· 与页内 tab 共享状态 */
export function FamilySidebar({
  families,
}: {
  families: { key: string; icon: string; label: string }[];
}) {
  const { activeFam, setFam, counts } = useFamilyState();
  return (
    <ul className="space-y-1 mb-8">
      {families.map((f) => {
        const isActive = f.key === activeFam;
        return (
          <li key={f.key}>
            <button
              type="button"
              onClick={() => setFam(f.key)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition border-l-[3px] ${
                isActive
                  ? 'bg-ink text-background border-l-coral'
                  : 'text-ink-soft hover:bg-bg-alt hover:text-ink border-l-transparent'
              }`}
            >
              <span className="flex items-center gap-2">{f.icon} {f.label}</span>
              <span className={`font-mono text-[11px] ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                {counts[f.key] || 0}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
