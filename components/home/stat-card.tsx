'use client';

/**
 * 统计数字卡 · 进入视口时数字从 0 滚动到目标值
 * reduced-motion 下直接显示最终数字
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

export function StatCard({
  num,
  label,
  sub,
  accent,
}: {
  num: string;
  label: string;
  sub: string;
  accent: 'coral' | 'teal' | 'gold' | 'ink';
}) {
  const accentClass = {
    coral: 'text-coral',
    teal: 'text-teal',
    gold: 'text-amber-700',
    ink: 'text-ink',
  }[accent];

  const target = parseInt(num, 10);
  const suffix = num.replace(String(target), ''); // "+' 等
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(reduce || isNaN(target) ? NaN : 0);

  useEffect(() => {
    if (!inView || isNaN(target) || reduce) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 45));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(t); }
      setDisplay(cur);
    }, 26);
    return () => clearInterval(t);
  }, [inView, target, reduce]);

  const shown = isNaN(display) ? num : `${display}${suffix}`;

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="press bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition-shadow"
    >
      <div className={`font-serif text-4xl md:text-5xl font-black leading-none mb-2 ${accentClass}`}>{shown}</div>
      <div className="text-sm font-semibold text-ink mb-0.5">{label}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">// {sub}</div>
    </motion.div>
  );
}
