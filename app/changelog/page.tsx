import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: '更新日志',
  description: 'AI Lens 的迭代记录 · 一个人 + AI 持续做下去',
};

export default function ChangelogPage() {
  return (
    <div className="container max-w-3xl py-12 pb-24">
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
        <Entry date="2026.10" tag="分发与效率">
          <Item>Agent 接入:RSS 订阅、llms.txt、公开 JSON API,把内容开放给 Agent 和阅读器</Item>
          <Item>首页新增「今日必读 Top 5」,回访用户不用再跳一跳</Item>
          <Item>资讯时间线:每条附「入选理由」;已读自动淡化 + 一键清除</Item>
          <Item>搜索三级扩展:分词 OR + 同义词,短 query 不再空手而归</Item>
        </Entry>

        <Entry date="2026.10" tag="AI 解析">
          <Item>资讯卡片新增「AI 解析」按钮:按需生成长文深度解析(事件全景/深层解读/竞争影响/PM 启示/后续信号),一次生成全站共享</Item>
          <Item>每日精编飞书推送修复:推送窗口从"精确小时匹配"改为"当日首次成功执行",不再因定时任务跳点而漏发</Item>
        </Entry>

        <Entry date="2026.09" tag="体验升级">
          <Item>三个页面(资讯/模型追踪/洞察)的分类切换改为客户端即时响应,不再整页刷新跳顶</Item>
          <Item>移动端适配:分类横向滑动 chips、汉堡抽屉菜单</Item>
          <Item>新手引导:4 步欢迎卡,六维拆解卡是主角</Item>
          <Item>滚动动效系统(motion):入场 stagger、数字滚动、光晕漂浮,全部尊重"减少动态"偏好</Item>
        </Entry>

        <Entry date="2026.09" tag="自动化">
          <Item>模型代际时间线自动更新:cron 扫描新闻检测新版本号,AI 生成摘要,误报护栏(信号词门控/去重/每次最多 3 条)+ 编辑审核</Item>
          <Item>模型家族从 5 个扩展:DeepSeek 独立成族,历史版本(V2/V3/R1/V3.1/V3.2-Exp)入库</Item>
        </Entry>

        <Entry date="2026.08" tag="基础能力">
          <Item>六维拆解卡:每条精选资讯自动生成"文章概览 + STAR + 行动启示",5 分钟读懂一条</Item>
          <Item>个性化每日精编:按模块/模型定制,反馈画像越用越准,邮件/飞书/京ME 三通道</Item>
          <Item>全站埋点:AI 调用四通道 fallback(DeepSeek/智谱/Groq/Gemini)全量可观测</Item>
          <Item>内容排行榜:综合热度/阅读/讨论三榜</Item>
        </Entry>

        <Entry date="2026.07" tag="v2.0 上线">
          <Item>Next.js 15 + Supabase 全站重写,30+ 信源每 30 分钟自动抓取</Item>
          <Item>五大模型家族代际时间线手工建库,22 个模型价格/上下文每 6 小时同步</Item>
        </Entry>
      </div>

      <div className="mt-12 pt-6 border-t border-dashed border-line text-sm text-muted-foreground">
        想要什么功能?欢迎<a href="/about" className="text-coral font-bold hover:underline">联系告知</a> ·
        代码开源于 <a href="https://github.com/YIDUO123/AI-Lens" target="_blank" rel="noopener noreferrer" className="text-coral font-bold hover:underline">GitHub</a>
      </div>
    </div>
  );
}

function Entry({ date, tag, children }: { date: string; tag: string; children: React.ReactNode }) {
  return (
    <section className="relative pl-8">
      <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-[3px] border-ink bg-cream z-10" />
      <div className="absolute left-[7px] top-6 bottom-[-2.5rem] w-0.5 bg-line" />
      <div className="flex items-center gap-2.5 mb-3">
        <span className="bg-ink text-background px-2.5 py-0.5 rounded font-mono text-sm font-bold">{date}</span>
        <span className="inline-flex items-center gap-1 text-xs font-black tracking-wide text-coral">
          <Sparkles className="w-3.5 h-3.5" />
          {tag}
        </span>
      </div>
      <ul className="space-y-2">
        {children}
      </ul>
    </section>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-sm text-ink-soft leading-relaxed pl-4 relative">
      <span className="absolute left-0 top-[9px] w-1 h-1 rounded-full bg-coral" />
      {children}
    </li>
  );
}
