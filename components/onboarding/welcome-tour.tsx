'use client';

/**
 * 新手引导 · 首次访问的 4 步欢迎卡片
 * 核心亮点:6 维拆解卡(把长报告压成一屏,2 分钟读完 · 信息溯源)
 * localStorage 记忆,只出现一次;尊重 prefers-reduced-motion
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';import { Newspaper, Layers3, Scale, Mail, ArrowRight, Link2 } from 'lucide-react';

const STORAGE_KEY = 'ailens-welcome-v1';

// 6 维拆解 · 与产品内真实卡片字段一致(定位/痛点/解法/亮点/Vibe Coding/商业)
const SIX_DIMS: { label: string; hint: string; tint: string }[] = [
  { label: '定位', hint: '它在赛道里的位置', tint: 'text-coral' },
  { label: '痛点', hint: '解决什么真实需求', tint: 'text-teal' },
  { label: '解法', hint: '核心机制', tint: 'text-blue-700' },
  { label: '亮点', hint: '别人没做到的', tint: 'text-amber-700' },
  { label: 'Vibe Coding', hint: '如何快速复现', tint: 'text-purple-700' },
  { label: '商业', hint: '定价与天花板', tint: 'text-ink' },
];

const STEPS = [
  {
    icon: Newspaper,
    tile: 'bg-coral text-white',
    title: '每天 200+ 条 AI 动态,帮你滤掉噪声',
    desc: '全球 30+ 公开信源每 30 分钟聚合一次,按模型 / 产品 / 行业 / 论文 / 技巧分类,只留真正值得读的信号。',
  },
  {
    icon: Layers3,
    tile: 'bg-teal text-white',
    title: '六维拆解:长报告压成一屏,2 分钟读完',
    desc: '每条资讯都拆成定位 · 痛点 · 解法 · 亮点 · Vibe Coding · 商业六格,附信息溯源,高效概览不漏关键。',
    visual: 'six-dims',
  },
  {
    icon: Scale,
    tile: 'bg-ink text-background',
    title: '模型一页横向比,代际弧线纵向追',
    desc: '任选 4 个模型对比能力与价格;五大 AI 家族从起点到最新版本的完整演化,一页看清。',
  },
  {
    icon: Mail,
    tile: 'bg-coral text-white',
    title: '邮箱 / 微信 / 飞书,按需订阅',
    desc: '日报或特定 AI 模型动态,每天早 9 点送达。不打广告,一键退订。',
    cta: { href: '/news', label: '免费订阅体验' },
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
    // 不用 AnimatePresence:退场动画一旦卡住会留下全屏隐形遮罩挡住整站;
    // 只保留入场动画,关闭即卸载,健壮性优先
    open && (
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
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
            className="relative w-full max-w-md bg-cream border-2 border-ink rounded-3xl shadow-brutal-lg p-7 md:p-8"
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
            <div className={`w-14 h-14 border-2 border-ink rounded-2xl grid place-items-center mb-5 shadow-brutal-sm ${current.tile}`}>
              <current.icon className="w-6 h-6" />
            </div>

            {/* 内容(切换时淡入 · 不用 AnimatePresence:连点时退场动画可能卡死导致内容消失) */}
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

              {/* 6 维拆解 · 迷你真卡片(与站内拆解卡同构) */}
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
                  <div className="flex items-center gap-1.5 px-3.5 py-2 bg-bg-alt text-[10px] text-muted-foreground">
                    <Link2 className="w-3 h-3" />
                    每格信息可溯源 · 点回原文核实
                  </div>
                </div>
              )}
            </motion.div>

            {/* 底部:进度点 + 按钮 */}
            <div className="flex items-center justify-between gap-3">
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
