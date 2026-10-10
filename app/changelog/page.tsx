import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { CHANGELOG, LATEST_CHANGELOG_ID } from '@/lib/content/changelog';
import { MarkChangelogSeen } from '@/components/changelog-dot';

export const metadata: Metadata = {
  title: '更新日志',
  description: 'AI Lens 的迭代记录 · 一个人 + AI 持续做下去',
};

export default function ChangelogPage() {
  return (
    <div className="container max-w-3xl py-12 pb-24">
      <MarkChangelogSeen latestId={LATEST_CHANGELOG_ID} />

      <div className="mb-10">
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Changelog · 更新日志</div>
        <h1 className="text-4xl font-black tracking-[-0.03em] leading-tight mb-4">
          这个站是怎么<em className="accent">长出来的</em>
        </h1>
        <p className="text-ink-soft leading-relaxed">
          每一轮迭代都记录在这里。倒序排列 · 最近在上。
        </p>
      </div>

      <div className="space-y-10">
        {CHANGELOG.map((e) => (
          <section key={e.id} className="relative pl-8">
            <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-[3px] border-ink bg-cream z-10" />
            <div className="absolute left-[7px] top-6 bottom-[-2.5rem] w-0.5 bg-line" />
            <div className="flex items-center gap-2.5 mb-3">
              <span className="bg-ink text-background px-2.5 py-0.5 rounded font-mono text-sm font-bold">{e.date}</span>
              <span className="inline-flex items-center gap-1 text-xs font-black tracking-wide text-coral">
                <Sparkles className="w-3.5 h-3.5" />
                {e.tag}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{e.id}</span>
            </div>
            <ul className="space-y-2">
              {e.items.map((item, i) => (
                <li key={i} className="text-sm text-ink-soft leading-relaxed pl-4 relative">
                  <span className="absolute left-0 top-[9px] w-1 h-1 rounded-full bg-coral" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t border-dashed border-line text-sm text-muted-foreground">
        想要什么功能?欢迎<a href="/about" className="text-coral font-bold hover:underline">联系告知</a> ·
        代码开源于 <a href="https://github.com/YIDUO123/AI-Lens" target="_blank" rel="noopener noreferrer" className="text-coral font-bold hover:underline">GitHub</a>
      </div>
    </div>
  );
}
