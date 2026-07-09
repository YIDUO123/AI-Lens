import Link from 'next/link';
import { ArrowLeft, Coffee, Heart, MessageCircle } from 'lucide-react';
import { QrCard } from '@/components/support/qr-card';

export const metadata = { title: '打赏支持 · AI Lens' };

export default function SupportPage() {
  return (
    <div className="container max-w-3xl py-16 pb-24">
      <Link href="/about" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-coral mb-8">
        <ArrowLeft className="w-4 h-4" /> 返回关于页
      </Link>

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-br from-coral to-gold text-white rounded-full px-4 py-1.5 text-[11px] font-black tracking-widest uppercase mb-6">
          <Coffee className="w-3.5 h-3.5" /> Support the creator
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-[-0.04em] leading-[1.05] mb-4">
          请我喝杯 <em className="accent">咖啡</em> ☕
        </h1>
        <p className="text-base text-ink-soft leading-relaxed max-w-lg mx-auto">
          AI Lens 完全免费,无广告、无付费墙。如果内容让你觉得有价值,一杯咖啡就够我多写一小时。
        </p>
      </div>

      {/* 二维码卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <QrCard
          title="微信"
          subtitle="扫码打赏"
          qrPath="/qr-wechat.png"
          fallbackColor="from-green-500 to-green-600"
          fallbackIcon="💚"
        />
        <QrCard
          title="支付宝"
          subtitle="扫码打赏"
          qrPath="/qr-alipay.png"
          fallbackColor="from-blue-500 to-blue-600"
          fallbackIcon="💙"
        />
      </div>

      {/* 说明 */}
      <div className="bg-cream border-2 border-ink rounded-2xl p-8 shadow-brutal-sm mb-8">
        <h3 className="text-xl font-black tracking-tight mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-coral fill-coral" /> 你的支持意味着什么
        </h3>
        <ul className="space-y-3 text-[15px] text-ink-soft leading-relaxed">
          <li className="pl-5 relative">
            <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-coral" />
            <b className="text-ink">帮我保持独立</b> —— 拒绝广告 / 软文 / 数据倒卖 · 保证观点纯粹
          </li>
          <li className="pl-5 relative">
            <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-coral" />
            <b className="text-ink">支付基础运维</b> —— 域名 · Vercel Pro · Supabase · OpenRouter API 调用
          </li>
          <li className="pl-5 relative">
            <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-coral" />
            <b className="text-ink">激励持续更新</b> —— 每周多写 2 篇深度长文 · 而不是应付式产出
          </li>
        </ul>
      </div>

      {/* 备注 */}
      <div className="bg-orange-50 border-2 border-dashed border-coral/40 rounded-xl p-6 text-center">
        <MessageCircle className="w-6 h-6 text-coral mx-auto mb-2" />
        <p className="text-sm text-ink-soft leading-relaxed">
          <b className="text-ink">打赏留言可以备注你的想看内容</b> —— <br />
          我会优先安排更新那些方向。<br />
          谢谢每一位选择支持独立创作的你 💛
        </p>
      </div>
    </div>
  );
}
