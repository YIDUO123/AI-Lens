import type { Metadata } from 'next';
import Link from 'next/link';
import { Rss, Terminal, Braces, Bot } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agent 接入',
  description: '把 AI Lens 接进你的 Agent:RSS / llms.txt / 公开 JSON API,匿名只读,无需 Key',
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || 'https://ailens.cloud';

export default function AgentPage() {
  return (
    <div className="container max-w-4xl py-12 pb-24">
      {/* 页头 */}
      <div className="mb-10">
        <div className="text-[10px] font-black tracking-widest uppercase text-coral mb-2">Agent 接入 · 给机器看的数据</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-[-0.03em] leading-tight mb-4">
          把 AI Lens 接进你的 <em className="accent">Agent</em>
        </h1>
        <p className="text-ink-soft leading-relaxed max-w-2xl">
          RSS、llms.txt、JSON API 读的是同一份数据:今日精选 + 最新资讯流 + 六维拆解。
          匿名只读,不用注册,也不用 API Key。
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 bg-cream border-[1.5px] border-ink rounded-full px-3 py-1 text-xs font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-dot" />服务正常
          </span>
          <span className="bg-bg-alt border border-line rounded-full px-3 py-1 text-xs font-mono text-muted-foreground">rate: 30min 缓存</span>
          <span className="bg-bg-alt border border-line rounded-full px-3 py-1 text-xs font-mono text-muted-foreground">CORS: *</span>
        </div>
      </div>

      {/* 三种接入方式 */}
      <div className="space-y-5">
        <Channel
          icon={<Braces className="w-5 h-5" />}
          tile="bg-teal text-white"
          title="JSON API"
          sub="程序/Agent 取数首选"
          endpoint={`GET ${SITE}/api/public/digest`}
        >
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            返回今日精选 JSON:标题、TL;DR、六维拆解(有缓存时)、原文链接、站内卡片链接。
            <code className="font-mono text-coral">?limit=20</code> 可取最多 20 条。
          </p>
          <CodeBlock>{`curl ${SITE}/api/public/digest?limit=10`}</CodeBlock>
        </Channel>

        <Channel
          icon={<Rss className="w-5 h-5" />}
          tile="bg-coral text-white"
          title="RSS 订阅"
          sub="阅读器 / Folo / Inoreader"
          endpoint={`GET ${SITE}/rss.xml`}
        >
          <p className="text-sm text-ink-soft leading-relaxed">
            最新 50 条资讯的 RSS 2.0 源,30 分钟更新,链接指向站内六维卡。
          </p>
        </Channel>

        <Channel
          icon={<Bot className="w-5 h-5" />}
          tile="bg-ink text-background"
          title="llms.txt"
          sub="给 Agent 的站点说明书"
          endpoint={`GET ${SITE}/llms.txt`}
        >
          <p className="text-sm text-ink-soft leading-relaxed">
            按 llms.txt 约定描述了本站是什么、有哪些资源、怎么引用。
            Claude / Cursor / ChatGPT 等带浏览能力的 Agent 读一遍就知道怎么用这个站。
          </p>
        </Channel>
      </div>

      {/* MCP 预告 */}
      <div className="mt-8 rounded-2xl border-2 border-dashed border-line bg-bg-alt/50 px-6 py-5">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <b className="text-sm font-black">MCP Server · 规划中</b>
          <span className="text-[10px] font-black tracking-widest uppercase bg-bg-alt text-muted-foreground px-2 py-0.5 rounded">soon</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          计划提供 search_news / get_card / get_timeline 等工具的 MCP 端点,给 Claude Desktop、Cursor 等
          MCP 客户端直连。需要什么工具,欢迎提<a href="/about" className="text-coral font-bold hover:underline">反馈</a>。
        </p>
      </div>

      {/* 使用约定 */}
      <div className="mt-8 text-xs text-muted-foreground leading-relaxed">
        使用约定:内容为中文;引用请注明来源 AI Lens 并回链原文页;六维拆解由 AI 生成、人工审核,事实以原文链接为准。
        返回 <Link href="/" className="text-coral font-bold hover:underline">首页</Link>
      </div>
    </div>
  );
}

function Channel({
  icon, tile, title, sub, endpoint, children,
}: {
  icon: React.ReactNode; tile: string; title: string; sub: string; endpoint: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm">
      <div className="flex items-center gap-3 mb-3.5">
        <span className={`w-11 h-11 rounded-xl border-2 border-ink grid place-items-center flex-shrink-0 ${tile}`}>{icon}</span>
        <div>
          <h2 className="text-lg font-black tracking-tight leading-tight">{title}</h2>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
      </div>
      <div className="mb-3 inline-flex items-center gap-2 bg-ink text-background rounded-lg px-3 py-1.5 font-mono text-[12px] max-w-full overflow-x-auto">
        {endpoint}
      </div>
      {children}
    </section>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-ink text-background rounded-xl px-4 py-3 text-[12.5px] font-mono overflow-x-auto">
      {children}
    </pre>
  );
}
