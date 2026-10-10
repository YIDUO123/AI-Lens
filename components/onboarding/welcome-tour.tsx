'use client';

/**
 * 新手/回访引导 · 6 步覆盖全站核心功能
 * 弹出逻辑:从未看过 → 弹;看过但内容版本更新 或 距上次超过 30 天 → 再弹一次
 * 动画只用入场(无退场环节),连点/关闭都不会卡死
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Newspaper, Layers3, Sparkles, BookOpen, Scale, Mail, ArrowRight, ArrowUpRight } from 'lucide-react';

const STORAGE_KEY = 'ailens-welcome-v2';
const VERSION = '2026-10-b'; // 内容更新时 bump,老用户会再看一次
const REVISIT_DAYS = 30;

// 6 维拆解 · 与站内资讯卡字段一致
const SIX_DIMS: { label: string; hint: string; tint: string }[] = [
  { label: '概览', hint: '一段话讲清楚', tint: 'text-coral' },
  { label: 'S 情境', hint: '背景是什么', tint: 'text-teal' },
  { label: 'T 焦点', hint: '看点在哪', tint: 'text-blue-700' },
  { label: 'A 行动', hint: '宣布了什么', tint: 'text-amber-700' },
  { label: 'R 结果', hint: '影响与数据', tint: 'text-purple-700' },
  { label: '启示', hint: '我该做什么', tint: 'text-ink' },
];

// AI 深度解析 · 长文结构
const DEEP_SECTIONS = ['一句话导读', '事件全景', '深层解读', '竞争与生态影响', '给 PM 的启示', '后续盯什么信号'];

const STEPS: {
  icon: any;
  tile: string;
  title: string;
  desc: string;
  visual?: 'six-dims' | 'deep-analysis';
  link?: { href: string; label: string };
  cta?: { href: string; label: string };
}[] = [
  {
    icon: Newspaper,
    tile: 'bg-coral text-white',
    title: 'AI 资讯流:每天 200+ 条动态,帮你滤掉噪声',
    desc: '全球 30+ 信源每 30 分钟聚合一次。想按专题看?试试主题聚合;想知道大家都在讨论什么?看热点榜。',
    link: { href: '/news', label: '去资讯流' },
  },
  {
    icon: Layers3,
    tile: 'bg-teal text-white',
    title: '六维拆解:一条资讯,2 分钟读懂',
    desc: '点开资讯卡片,每条都拆成六格 + 行动启示,信息可溯源。',
    visual: 'six-dims',
  },
  {
    icon: Sparkles,
    tile: 'bg-coral text-white',
    title: 'AI 深度解析:想读透,点一下',
    desc: '资讯卡上的「AI 解析」按钮按需生成 800-1200 字长文,一次生成全站共享。',
    visual: 'deep-analysis',
  },
  {
    icon: BookOpen,
    tile: 'bg-teal text-white',
    title: '产品拆解:像投研报告一样看 AI 产品',
    desc: '每日创投精选自动追踪 + PM 视角六维判断,谁写的、什么时候写的,标得清清楚楚。',
    link: { href: '/teardowns', label: '去拆解库' },
  },
  {
    icon: Scale,
    tile: 'bg-ink text-background',
    title: '模型追踪:横向比价格,纵向看演化',
    desc: '任选 4 个模型对比能力与价格;五大 AI 家族从起点到最新的完整代际弧线。',
    link: { href: '/timeline', label: '去对比模型' },
  },
  {
    icon: Mail,
    tile: 'bg-coral text-white',
    title: '邮箱 / 微信 / 飞书,按需订阅',
    desc: '每天早 9 点 10 条精选送达,可按模块与模型定制。不打广告,一键退订。',
    cta: { href: '/me', label: '免费订阅体验' },
  },
];

export function WelcomeTour() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as { v: string; at: number }) : null;
      const stale = !stored || stored.v !== VERSION || Date.now() - stored.at > REVISIT_DAYS * 86400000;
      if (stale) timer = setTimeout(() => setOpen(true), 900);
    } catch {}
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: VERSION, at: Date.now() })); } catch {}
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    open && (
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[90] grid place-items-center bg-ink/45 backdrop-blur-sm px-4"
        onClick={dismiss}
        role="dialog"
        aria-modal="true"
        aria-label="AI Lens 功能引导"
      >
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-cream border-2 border-ink rounded-3xl shadow-brutal-lg p-7 md:p-8 max-h-[92dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="跳过引导"
            className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-line bg-white text-ink-soft hover:border-ink hover:text-ink transition grid place-items-center text-sm font-bold"
          >
            ✕
          </button>

          <div className={`w-14 h-14 border-2 border-ink rounded-2xl grid place-items-center mb-5 shadow-brutal-sm ${current.tile}`}>
            <current.icon className="w-6 h-6" />
          </div>

          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22 }}
          >
            <h3 className="text-xl font-black tracking-tight leading-snug mb-2.5 pr-6">
              {current.title}
            </h3>
            <p className="text-sm text-ink-soft leading-relaxed mb-5">{current.desc}</p>

            {current.visual === 'six-dims' && (
              <div className="mb-5 rounded-2xl border-2 border-ink bg-white overflow-hidden shadow-brutal-sm">
                <div className="flex items-center justify-between px-3.5 py-2 bg-ink text-background text-[10px] font-black tracking-widest">
                  <span>SIX-DIM CARD · 六维拆解卡</span>
                  <span className="text-coral">2 min read</span>
                </div>
                <div className="grid grid-cols-3 gap-px bg-line">
                  {SIX_DIMS.map((d) => (
                    <div key={d.label} className="bg-cream px-2.5 py-2">
                      <div className={`text-[11px] font-black leading-tight ${d.tint}`}>{d.label}</div>
                      <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">{d.hint}</div>
                    </div>
                  ))}
                </div>
                <div className="px-3.5 py-2 bg-bg-alt text-[10px] text-muted-foreground">
                  入口:资讯卡片上的「六维拆解」按钮
                </div>
              </div>
            )}

            {current.visual === 'deep-analysis' && (
              <div className="mb-5 rounded-2xl border-2 border-ink bg-white overflow-hidden shadow-brutal-sm">
                <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-coral to-gold text-white text-[10px] font-black tracking-widest">
                  <span>AI 深度解析 · 长文</span>
                  <span className="opacity-80">800-1200 字</span>
                </div>
                <div className="px-3.5 py-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {DEEP_SECTIONS.map((s) => (
                    <div key={s} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                      <span className="w-1 h-1 rounded-full bg-coral flex-shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
                <div className="px-3.5 py-2 bg-bg-alt text-[10px] text-muted-foreground">
                  入口:资讯卡片上的「AI 解析」按钮 · 生成一次全站共享
                </div>
              </div>
            )}

            {current.link && (
              <Link
                href={current.link.href}
                onClick={dismiss}
                className="inline-flex items-center gap-1 text-xs font-black text-coral hover:underline mb-4"
              >
                {current.link.label}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>

          <div className="flex items-center justify-between gap-3 mt-2">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`第 ${i + 1} 步`}
                  onClick={() => setStep(i)}
                  className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-coral' : 'w-2 bg-line hover:bg-muted/40'}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="px-3.5 py-2 rounded-lg text-sm font-bold text-ink-soft hover:text-ink transition"
                >
                  上一步
                </button>
              )}
              {isLast ? (
                <Link
                  href={current.cta?.href || '/news'}
                  onClick={dismiss}
                  className="press inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-coral to-gold text-white border-2 border-ink rounded-xl text-base font-black tracking-wide shadow-brutal hover:-translate-y-0.5 hover:shadow-brutal-lg transition-all"
                >
                  {current.cta?.label || '开始探索'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="press inline-flex items-center gap-1.5 px-5 py-2 bg-ink text-background border-2 border-ink rounded-lg text-sm font-black shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition"
                >
                  下一步
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  );
}
