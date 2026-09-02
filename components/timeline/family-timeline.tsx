'use client';

/**
 * 模型追踪 · 家族 tab + 家族时间线(客户端)
 * 5 个家族的时间线数据全部由服务端一次性传入,
 * tab 切换纯本地状态 · 零网络请求 · 不跳顶不刷新;URL 用 replaceState 同步保证可分享
 */
import { useState } from 'react';
import { RevealGroup, RevealItem } from '@/components/motion/reveal';

export type TimelineVersionDTO = {
  id: string;
  family: string;
  version: string;
  title: string;
  dateLabel: string;
  breakthrough: boolean;
  changes: string[];
  capability: string | null;
  signal: string | null;
};

type FamilyMeta = { key: string; icon: string; label: string; tagline: string; lead: string };

export function FamilyTimeline({
  families,
  counts,
  timelines,
  initialFam,
  famColors,
}: {
  families: FamilyMeta[];
  counts: Record<string, number>;
  timelines: Record<string, TimelineVersionDTO[]>;
  initialFam: string;
  famColors: Record<string, string>;
}) {
  const [activeFam, setActiveFam] = useState(initialFam);

  const switchFam = (key: string) => {
    if (key === activeFam) return;
    setActiveFam(key);
    // 同步 URL(不触发导航),保持可分享/可刷新
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('fam', key);
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  const family = families.find((f) => f.key === activeFam) || families[0];
  const versions = timelines[family.key] || [];

  if (versions.length === 0) {
    return (
      <>
        <FamilyTabBar families={families} counts={counts} activeFam={family.key} onSwitch={switchFam} />
        <div className="p-10 text-center text-muted-foreground">该家族暂无版本记录</div>
      </>
    );
  }

  const breakthroughs = versions.filter((v) => v.breakthrough).length;
  const latest = versions[0];
  const earliest = versions[versions.length - 1];

  return (
    <>
      <FamilyTabBar families={families} counts={counts} activeFam={family.key} onSwitch={switchFam} />

      {/* 家族总览 hero */}
      <div key={`hero-${family.key}`} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/60 to-amber-100 border-2 border-ink p-7 md:p-8 shadow-brutal mb-8">
        <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.12),transparent_70%)] pointer-events-none" />

        <div className="flex items-center gap-3 flex-wrap mb-2.5">
          <span className="text-2xl">{family.icon}</span>
          <h2 className="text-2xl font-black tracking-[-0.02em]">{family.label}</h2>
          <span
            className="text-white text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: famColors[family.key] }}
          >
            {family.tagline}
          </span>
        </div>
        <p className="text-sm text-ink-soft leading-relaxed max-w-none md:max-w-4xl mb-5">{family.lead}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 rounded-lg border border-ink/10 bg-white/50 overflow-hidden">
          <FoStat num={String(versions.length)} label="代际数" />
          <FoStat num={String(breakthroughs)} label="突破点" />
          <FoStat num={latest.dateLabel} label="最新版本" small />
          <FoStat num={earliest.dateLabel} label="起源" small />
        </div>
      </div>

      {/* 垂直时间轴 */}
      <div key={`tl-${family.key}`} className="relative pl-11">
        <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-ink to-line" />

        <RevealGroup className="space-y-8">
          {versions.map((v, i) => (
            <RevealItem key={v.id}>
              <TimelineItem v={v} isLatest={i === 0} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </>
  );
}

function FamilyTabBar({
  families, counts, activeFam, onSwitch,
}: {
  families: FamilyMeta[];
  counts: Record<string, number>;
  activeFam: string;
  onSwitch: (key: string) => void;
}) {
  return (
    <div className="mb-6 flex gap-1.5 rounded-xl border-2 border-ink bg-cream p-1.5 shadow-brutal-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {families.map((f) => {
        const isActive = f.key === activeFam;
        const count = counts[f.key] || 0;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onSwitch(f.key)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${
              isActive ? 'bg-ink text-background' : 'text-ink-soft hover:bg-bg-alt'
            }`}
          >
            <span>{f.icon}</span><span>{f.label}</span>
            <small className={`text-[10px] font-normal ml-0.5 ${isActive ? 'text-white/55' : 'text-muted-foreground'}`}>{count}</small>
          </button>
        );
      })}
    </div>
  );
}

function TimelineItem({ v, isLatest }: { v: TimelineVersionDTO; isLatest: boolean }) {
  const classes = [
    'relative bg-cream border-2 border-ink rounded-2xl px-6 py-5 shadow-brutal-sm',
    'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition',
  ];
  if (v.breakthrough) classes.push('bg-gradient-to-br from-orange-50 to-amber-100/60');

  return (
    <div className={classes.join(' ')}>
      {/* 圆点 */}
      <div className={`absolute -left-[35px] top-5 w-4 h-4 rounded-full border-[3px] ${v.breakthrough ? 'bg-gold border-coral shadow-[0_0_0_4px_rgba(255,107,53,0.15)]' : 'bg-background border-ink'} z-10`} />

      {/* LATEST 徽 */}
      {isLatest && (
        <div className="absolute -top-2.5 right-5 bg-coral text-white text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full shadow-brutal-sm">
          LATEST
        </div>
      )}

      <div className="flex justify-between items-start flex-wrap gap-2.5 mb-2.5">
        <div className="flex items-center gap-2 text-lg font-black tracking-tight">
          {v.breakthrough && <span className="bg-gold text-ink text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase">🌟 突破</span>}
          <em className="accent not-italic font-serif italic">{v.version}</em>
        </div>
        <span className="font-mono text-xs font-bold text-coral tracking-wide bg-background px-2 py-0.5 rounded border border-line">
          {v.dateLabel}
        </span>
      </div>

      {v.title && <div className="text-sm text-ink-soft mb-3">{v.title}</div>}

      {v.changes && Array.isArray(v.changes) && v.changes.length > 0 && (
        <ul className="p-3 px-3.5 bg-bg-alt rounded-lg space-y-1 mb-3">
          {v.changes.map((c: string, i: number) => (
            <li key={i} className="text-[12.5px] text-ink-soft pl-3.5 relative leading-relaxed">
              <span className="absolute left-0 top-2 w-1 h-1 rounded-full bg-coral" />
              {c}
            </li>
          ))}
        </ul>
      )}

      {v.capability && (
        <div className="grid grid-cols-[auto_1fr] gap-3 items-baseline p-2.5 px-3.5 rounded-lg bg-teal/6 border-l-[3px] border-teal text-sm leading-relaxed">
          <span className="text-[10px] font-black tracking-widest uppercase text-teal whitespace-nowrap">🌱 关键能力</span>
          <span className="text-ink-soft">{v.capability}</span>
        </div>
      )}

      {v.signal && (
        <div className="grid grid-cols-[auto_1fr] gap-3 items-baseline p-2.5 px-3.5 rounded-lg bg-gold/10 border-l-[3px] border-gold text-sm leading-relaxed mt-2">
          <span className="text-[10px] font-black tracking-widest uppercase text-amber-700 whitespace-nowrap">🎯 行业信号</span>
          <span className="text-ink-soft">{v.signal}</span>
        </div>
      )}
    </div>
  );
}

function FoStat({ num, label, small }: { num: string; label: string; small?: boolean }) {
  return (
    <div className="p-3 text-center border-r border-ink/8 last:border-r-0">
      <div className={`font-serif font-black text-coral leading-none mb-1 ${small ? 'text-base pt-1' : 'text-2xl'}`}>{num}</div>
      <div className="text-[10px] text-ink-soft">{label}</div>
    </div>
  );
}
