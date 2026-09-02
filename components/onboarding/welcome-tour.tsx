'use client';

/**
 * 新手引导 · 首次访问的 3 步欢迎卡片
 * localStorage 记忆,只出现一次;尊重 prefers-reduced-motion
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Newspaper, BookOpen, Mail, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'ailens-welcome-v1';

const STEPS = [
  {
    icon: Newspaper,
    tile: 'bg-coral text-white',
    title: '每天 200+ 条 AI 动态,帮你滤掉噪声',
    desc: '全球 30+ 公开信源每 30 分钟聚合一次,按模型 / 产品 / 行业 / 论文 / 技巧分类,只留真正值得读的信号。',
    accent: 'text-coral',
  },
  {
    icon: BookOpen,
    tile: 'bg-teal text-white',
    title: '产品像投研报告一样拆,模型一页横向比',
    desc: '深度拆解库附 PM 视角的六维判断;模型追踪页可以任选 4 个模型做能力与价格对比。',
    accent: 'text-teal',
  },
  {
    icon: Mail,
    tile: 'bg-ink text-background',
    title: '每天早 9 点,10 条精选推到邮箱',
    desc: '订阅每日精编,可按模块与模型定制。不打广告,一键退订。',
    accent: 'text-ink',
    cta: { href: '/news', label: '开始探索' },
  },
];

export function WelcomeTour() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        timer = setTimeout(() => setOpen(true), 900);
      }
    } catch {}
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome-tour"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-ink/45 backdrop-blur-sm px-4"
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-label="AI Lens 新手引导"
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-cream border-2 border-ink rounded-3xl shadow-brutal-lg p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭 */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="跳过引导"
              className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-line bg-white text-ink-soft hover:border-ink hover:text-ink transition grid place-items-center text-sm font-bold"
            >
              ✕
            </button>

            {/* 图标块 */}
            <div className={`w-14 h-14 border-2 border-ink rounded-2xl grid place-items-center mb-5 ${current.tile}`}>
              <current.icon className="w-6 h-6" />
            </div>

            {/* 内容(切换时淡入) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                <h3 className="text-xl font-black tracking-tight leading-snug mb-2.5 pr-6">
                  {current.title}
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed mb-6">{current.desc}</p>
              </motion.div>
            </AnimatePresence>

            {/* 底部:进度点 + 按钮 */}
            <div className="flex items-center justify-between">
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
                    className="px-4 py-2 rounded-lg text-sm font-bold text-ink-soft hover:text-ink transition"
                  >
                    上一步
                  </button>
                )}
                {isLast ? (
                  <Link
                    href={current.cta?.href || '/news'}
                    onClick={dismiss}
                    className="press inline-flex items-center gap-1.5 px-5 py-2 bg-coral text-white border-2 border-ink rounded-lg text-sm font-black shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition"
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
      )}
    </AnimatePresence>
  );
}
