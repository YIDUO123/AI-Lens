/**
 * 一次性种子脚本
 * 把 Batch 8 静态版的手写内容全部灌入 Supabase
 * 幂等:重复跑不会创建重复,只会 upsert
 *
 * 运行:npm run db:seed
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { db, teardowns, articles, timelineVersions, dailyPicks } from './index';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// ============================================================
// 9 篇产品拆解(简版正文,详情可以在后台补)
// ============================================================
const TEARDOWNS = [
  { slug: 'chatgpt', title: 'ChatGPT · OpenAI 的通用助理', category: 'chat',
    positioning: 'OpenAI 的通用向消费级 AI',
    body: `## 定位\nOpenAI 的通用向消费级 AI,从 GPT-3.5 时代的通用聊天,到 GPT-5 时代的分层生态。\n\n## 目标用户\n- 大众消费者\n- API 开发者\n- 企业订阅客户\n\n## 商业模式\n- Free/Plus/Pro/Team/Enterprise 五档\n- GPT Store 应用市场\n- API 按 token 计费\n\n## 3 大亮点\n1. 分层定价覆盖全场景(nano/mini/pro/max)\n2. 语音、图像、Agent 一体化\n3. 稳定的 API 与 SDK 生态\n\n## PM 结论\n综合能力最强,但不是每个场景都最优 —— 需要"专业"选 Claude,需要"长上下文"选 Gemini,需要"低成本"选 Flash Lite。`,
    productUrl: 'https://chat.openai.com', readTime: 12 },

  { slug: 'claude', title: 'Claude · Anthropic 的专业向选择', category: 'chat',
    positioning: 'Anthropic 的专业向旗舰',
    body: `## 定位\n专业向标杆 · 从 alignment 起家。用"Constitutional AI + 长上下文 + Computer Use"三张牌打天下。\n\n## 3 大亮点\n1. 1M 上下文成为 Opus 标配(2026.05)\n2. Computer Use 稳定至企业级可用\n3. MCP 协议事实标准,生态最完整\n\n## PM 结论\n专业、深度、需要长上下文的场景首选;大流量、成本敏感场景 GPT-5 更合适。**这不是能力差异,是定位差异。**`,
    productUrl: 'https://claude.ai', readTime: 14 },

  { slug: 'gemini', title: 'Gemini · Google 的极致性价比', category: 'chat',
    positioning: 'Google 的长上下文旗舰',
    body: `## 定位\n大厂反攻从落后到并肩。核心策略:百万上下文 + 极低边际成本 + 全模态。\n\n## 3 大亮点\n1. Flash Lite 输入 $0.15/M · 大规模嵌入场景\n2. 全模态原生一体化(文/图/视/音)\n3. Google 全家桶集成\n\n## PM 结论\n"够用 + 便宜"抢长尾市场,而不是追顶级性能。适合大流量嵌入式 AI。`,
    productUrl: 'https://gemini.google.com', readTime: 11 },

  { slug: 'cursor', title: 'Cursor · 独立开发者的 AI IDE', category: 'coding',
    positioning: 'AI Native 编辑器 · 独立开发者胜利',
    body: `## 定位\nAI Native 编辑器 · 独立开发者的胜利。从 VS Code fork 起步,3 年内成为 AI 编码事实标准。\n\n## 3 大亮点\n1. Composer + Background Agent + Tab 三层体验\n2. 深度接入 Claude Opus 4.8\n3. "AI 从补全到委派"的产品化教科书\n\n## PM 结论\n定义了 AI IDE 的护城河:不是模型强,而是把 orchestrator 工作流做成产品。`,
    productUrl: 'https://cursor.com', readTime: 15 },

  { slug: 'gpt-5-codex', title: 'GPT-5 Codex · OpenAI 的专项编码线', category: 'coding',
    positioning: 'OpenAI 编码专项旗舰',
    body: `## 定位\n400K 上下文 · 极低单价 · 专为长任务重构而生。取代 GPT-4o 成为 API 编码默认选择。\n\n## PM 结论\nOpenAI 首次把编码作为独立产品线运营,而非"通用模型顺便能写代码"。`,
    productUrl: 'https://platform.openai.com', readTime: 10 },

  { slug: 'midjourney', title: 'Midjourney · 视觉的美学基准', category: 'creative',
    positioning: '视觉美学基准',
    body: `## 定位\nV7 的美学一致性 vs Sora 2 的动态想象力。两家不同的 AIGC 哲学。\n\n## PM 结论\n"美学一致性"是 Midjourney 的护城河,但视频时代它需要选边站。`,
    productUrl: 'https://midjourney.com', readTime: 13 },

  { slug: 'jimeng', title: '即梦 · 字节的视觉产品化', category: 'creative', isDomestic: true,
    positioning: '字节的视觉产品化',
    body: `## 定位\n短视频剪辑 + 素材生成 + 一键出图,深度绑定剪映生态。\n\n## PM 结论\n国内 AIGC 场景闭环最完整的产品 —— 从"产品向 AI 靠拢"而不是"从 AI 找场景"。`,
    productUrl: 'https://jimeng.jianying.com', readTime: 9 },

  { slug: 'doubao', title: '豆包 · 字节的国民级 AI', category: 'chat', isDomestic: true,
    positioning: '字节的国民 AI',
    body: `## 定位\n抖音式冷启动 + 场景化入口 + 手机预装,快速拿下语音口语场景。\n\n## PM 结论\n"渠道 + 场景"打法证明比"模型性能"更容易赢用户 —— 反 OpenAI 路线的样板。`,
    productUrl: 'https://doubao.com', readTime: 10 },

  { slug: 'deepseek', title: 'DeepSeek · 中国的推理性价比之王', category: 'chat', isDomestic: true,
    positioning: '中国推理性价比之王',
    body: `## 定位\nV3.5 + R1 推理链,把"堪比 o1 的能力"做到了 1/10 定价。\n\n## PM 结论\n"中国 AI 追平了"从口号变现实,开源生态 + 极低单价 = 全球开发者涌入。`,
    productUrl: 'https://deepseek.com', readTime: 14 },
];

// ============================================================
// 7 篇洞察长文
// ============================================================
const ARTICLES = [
  { slug: 'ai-pm-3-layer', title: '为什么 AI 产品经理,应该比 AI 工程师更懂 AI?',
    category: 'thinking', featured: true,
    excerpt: '大家都在讨论模型能力天花板,但真正决定一个 AI 产品成败的,是产品经理对"能力边界"的判断力。本文用 3 个真实案例讲清楚 PM 该在哪一层做决策。',
    readTime: 12,
    body: `> "模型能力提升,产品经理会不会变得没那么重要?"\n\n我给出的回答是:**恰恰相反,模型越强,产品经理越关键 —— 前提是这个 PM 真的懂 AI**。\n\n## 第 1 层:技术层 —— 能力的物理边界在哪\n\n看排行榜、看跑分,谁都能得出结论。但排行榜领先的模型,不代表你的产品体验就领先。\n\n## 第 2 层:工程层 —— 可复现性、成本、时延\n\n这一层要回答的问题不是"能不能做到",而是"稳定做到需要付出什么代价"。\n\n## 第 3 层:产品层 —— 用户对"AI 犯错"的容忍度\n\n同样是"模型有 5% 出错率",在不同场景下用户的感受完全不同。\n\n**决定产品成败的其实不是模型的能力,而是 PM 在这张表上的判断精度。**` },

  { slug: 'cursor-composer', title: '连续用了 3 个月 Cursor Composer,我发现的 5 个 AI 编码盲区',
    category: 'hands-on', excerpt: 'Composer 是当下最"贴近人的直觉"的 AI 编码体验,但也有它自己的思维死角 —— 尤其是在"重构"和"跨文件依赖"上。',
    readTime: 8,
    body: `## 盲区 1:跨文件的隐式依赖\n你让它改一个函数签名,它会改。但如果这个函数被 20 个地方调用,它只改了当前打开的 3 个文件。\n\n## 盲区 2:重构类任务的"过度自信"\n\n## 盲区 3:测试代码的"表演性通过"\n\n## 盲区 4:副作用的隐藏\n\n## 盲区 5:领域知识的编造` },

  { slug: 'pm-framework', title: 'AI 产品的 4 象限验证法:先做能力 demo,还是场景 demo?',
    category: 'method', excerpt: '很多 AI 产品死于"技术炫技型 demo",也有的死于"没有技术底盘的场景幻想"。',
    readTime: 10,
    body: `## 4 个象限\n\n| | 技术强 | 场景强 |\n|---|---|---|\n| 需求已验证 | Q1:直接做 | Q2:找/换技术 |\n| 需求未验证 | Q3:验证场景 | Q4:两头危险 |\n\n**不要在同一次 demo 里同时验证技术和场景。**` },

  { slug: 'domestic-ai', title: '2026 上半年,国产 AI 到底追上来了没有?',
    category: 'industry', excerpt: 'DeepSeek R1、豆包 1.5、Qwen 3 —— 三家在不同赛道上给出了不同答案。',
    readTime: 15,
    body: `- **DeepSeek R1** · 推理能力追平 o1-mini,成本只有 1/10\n- **豆包 1.5 Pro** · 集成到抖音/剪映的场景闭环\n- **Qwen 3** · 开源生态最完整,给国内开发者一个"能用的底座"` },

  { slug: 'agent-hype', title: 'Agent 元年被高估了吗?',
    category: 'thinking', excerpt: '每个大厂都在讲 Agent,但真正在被日活用户"高频使用"的 Agent 少之又少。',
    readTime: 9,
    body: `## 3 个必要条件\n\n- **结果可验证**:AI 做完了,用户能一眼看出对不对\n- **过程可信任**:AI 在做的时候,用户能看到进度、随时打断\n- **失败可回滚**:错了能撤,不然用户不敢用` },

  { slug: 'claude-vs-gpt', title: '把 Claude 4.5 和 GPT-5 各用 1000 次之后:我的偏好切换记录',
    category: 'hands-on', excerpt: '没有跑分,只讲我在真实任务里的偏好流转。',
    readTime: 11,
    body: `## 我的偏好速览\n\n- 长文写作 → Claude\n- 编码 refactor → Claude(工程) / GPT(算法)\n- 复杂推理 → GPT(纯数学)\n- 多模态 → GPT\n- 安全性 → Claude` },

  { slug: 'prd-for-ai', title: 'AI 时代的 PRD 该怎么写:我留下的 7 个字段模板',
    category: 'method', excerpt: '传统 PRD 讲功能 + 界面,AI PRD 得多讲 7 个东西。',
    readTime: 7,
    body: `1. **能力上限声明**\n2. **容错 SLA**\n3. **回退路径**\n4. **Prompt 版本**\n5. **数据护栏**\n6. **反馈闭环**\n7. **成本预算**\n\n缺一个,上线后就会踩坑。` },
];

// ============================================================
// 精选创投产品 · 编辑手挑 · 6 维完整填写 · 作为兜底默认展示
// ============================================================
const PICKS = [
  {
    slug: 'cursor-composer-2',
    name: 'Cursor 2.0 · Composer 2',
    tagline: 'Background agents 生产可用,让 AI 独立完成多文件长任务',
    url: 'https://cursor.com',
    category: 'coding', logo: '⚡', logoColor: '#1a1a1a',
    source: 'Product Hunt', score: 92,
    positioning: 'AI Native IDE 的下一形态 —— 从"补全工具"升级为"长任务代理"',
    painPoint: 'AI 编码补全效果好,但一旦涉及跨文件重构就得开发者手动接管,agent 长任务的可靠性一直是行业痛点',
    solution: "把'开会 → 让 AI 独立干活 → 回来审阅 PR'的工作流做成 IDE 一等公民,Background Agent 能持续几小时,任务完成自动通知",
    designHighlight: '并行多 agent 面板 · agent 之间可以共享 context · diff 可视化 + 一键接受/拒绝的审阅工作流',
    vibeCoding: '复现路径:Cursor + Claude Opus 4.8 API + Tauri/Electron 壳 + git worktree 隔离并发编辑。核心是 orchestrator 拆任务 + 每个 subtask 独立 branch。',
    commercial: '独立开发者 $20/月 → 团队版 $50/座 → Enterprise SSO 定制。用户从 GitHub Copilot 大量迁移,估值 $9B',
    consensus: '开发者体验断层第一 · Background Agent 让长任务真正可用 · 多文件重构准确度大幅超越 Copilot',
    criticism: '价格偏高 · 内存占用大 · 部分老 codebase 上下文识别仍会犯错 · 隐私敏感场景不敢用',
    editorTake: "Cursor 定义了 'AI IDE' 的护城河:不是模型强,而是把 orchestrator 的工作流做成产品。这是 2026 年 AI 产品化的教科书案例。",
  },
  {
    slug: 'cline-agent',
    name: 'Cline · AI Coding Agent',
    tagline: '开源版 Cursor Agent,自带 MCP 生态',
    url: 'https://cline.bot',
    category: 'coding', logo: '🔧', logoColor: '#2F6FEB',
    source: 'GitHub Trending', score: 85,
    positioning: 'VS Code 插件形式的开源 AI Agent,面向不想付 Cursor 订阅费的开发者',
    painPoint: 'Cursor 好用但要付费且闭源;Copilot 便宜但 Agent 能力弱',
    solution: '深度集成 VS Code · 支持任意 LLM(Claude/GPT/Gemini/Ollama)· MCP 协议原生 · 全部开源',
    designHighlight: '对话面板与代码编辑区并行 · Auto-approve 模式让 agent 自主循环 · 支持读浏览器/终端反馈',
    vibeCoding: '整个项目本身就是 Vibe Coding 的样本 —— 大量 PR 由 Claude 生成。想复现:VS Code 插件框架 + Anthropic SDK + MCP client。',
    commercial: '开源不收费 · 用户带自己的 API key(BYOK)· 商业化想象空间:企业版托管 / MCP 服务器市场',
    consensus: '开源 + BYOK 模式极其吸引开发者 · MCP 集成让扩展能力天花板高 · GitHub 星标增速惊人',
    criticism: '上手门槛比 Cursor 高 · UI 精致度不如商业产品 · 需要用户自己配 API key',
    editorTake: "开源 + BYOK 是对抗商业闭源模型的关键武器。'开发者用自己的 API key' 这套路径值得所有 AI 工具借鉴。",
  },
  {
    slug: 'manus-agent',
    name: 'Manus · 通用型 AI Agent',
    tagline: '国内团队做的通用 Agent,能自主完成研究、编程、订机票',
    url: 'https://manus.im',
    category: 'ai-agent', logo: '🤖', logoColor: '#7C3AED',
    source: 'Product Hunt', score: 88,
    positioning: '面向普通用户的通用 Agent —— 不用写 Prompt,只需要告诉它目标',
    painPoint: '现有 Agent 大多面向开发者(需要 Prompt/API 知识),普通人想让 AI 干活但门槛太高',
    solution: '预设几十个高频场景模板(研究报告、买机票、订会议、爬数据),用户点选即可 · Agent 自动拆解任务并展示进度',
    designHighlight: '任务进度可视化 · 每一步可打断/修正 · 结果自动整理成可分享的报告页 · 支持定时重复任务',
    vibeCoding: '复现思路:Claude Computer Use + 浏览器控制 + 任务模板库 + 结果模板引擎。关键难点是任务分解的鲁棒性。',
    commercial: '免费额度 · 付费订阅 $30/月(企业版更高)· 主要 B2B 变现,C 端拉流量',
    consensus: '国内 Agent 产品的技术标杆 · UX 设计确实照顾了非技术用户 · 任务成功率高于同类',
    criticism: 'Free tier 限制过紧 · 有些复杂任务仍会失败 · 国际版本地化不足',
    editorTake: "验证了国内团队在'产品化 Agent'方向的可能性。真正的挑战不是模型能力,而是产品定义能力 —— Manus 找到了'任务模板'这个中间层。",
  },
  {
    slug: 'elicit-research',
    name: 'Elicit · AI 研究助手',
    tagline: "把'文献综述'从周级压缩到分钟级",
    url: 'https://elicit.com',
    category: 'productivity', logo: '📚', logoColor: '#0E5C5A',
    source: 'Product Hunt', score: 82,
    positioning: '面向学术研究者/知识工作者的专业级 AI 文献工具',
    painPoint: '文献综述效率极低 · 学术论文密度太高 · 手工整理表格耗时数天',
    solution: '输入研究问题 → 自动跨 arXiv/PubMed 检索 → 提取关键数据 → 生成对比表格 · 每条结论可追溯到原文段落',
    designHighlight: "'可解释性'做到极致 · 每个 AI 输出都附源自哪篇论文的哪一段 · 支持自定义提取维度",
    vibeCoding: '复现路径:向量数据库(pgvector/Pinecone)+ 论文全文抓取 + Claude/GPT 信息抽取 + 表格模板引擎。数据授权是关键难点。',
    commercial: '个人版 $12/月 · 团队 $30/座 · 学术机构订阅 · 已被多所大学采购',
    consensus: '研究者最爱工具之一 · "可追溯"解决了 AI 幻觉焦虑 · 出稿效率革命性提升',
    criticism: '中文论文支持弱 · 部分学科覆盖不全 · 复杂逻辑推理仍需人工',
    editorTake: "'可解释性 = 竞争力'的最佳案例。当 AI 输出可追溯时,专业用户才敢用它做严肃决策。这是所有 B 端 AI 产品的必修课。",
  },
  {
    slug: 'warp-terminal',
    name: 'Warp · AI 终端',
    tagline: '重塑终端体验的 AI Native 命令行',
    url: 'https://warp.dev',
    category: 'coding', logo: '⚡', logoColor: '#FF6B35',
    source: 'Product Hunt', score: 87,
    positioning: '开发者日常最高频工具(终端)的 AI 重构版本',
    painPoint: '传统终端命令记不住 · man page 难读 · 出错信息不友好 · 老工具老界面',
    solution: '自然语言 → 命令翻译 · 智能错误分析 · Blocks 概念让命令有"输入输出"包裹感 · 内置 AI 补全',
    designHighlight: 'Blocks 交互(每条命令是独立卡片 · 可复制/分享)· 命令历史语义搜索 · 团队 workflow 共享',
    vibeCoding: '复现路径:Tauri/Electron + PTY 桥接 + Claude 命令翻译 + 自建 Blocks UI 组件。核心壁垒是 Blocks 交互体验的精细度。',
    commercial: '免费个人版 · Pro $15/月 · Team $22/座 · 采用率在开发者社区快速攀升',
    consensus: '重新定义了终端 UX · AI 命令补全极其精准 · 团队协作场景很棒',
    criticism: '内存占用较大 · macOS 优先(Linux/Windows 略差)· 部分老命令兼容问题',
    editorTake: "证明了'最古老的工具也能被 AI 重塑'。AI 时代不是要发明新场景,而是要重做旧场景 —— 因为旧场景的日活最大。",
  },
  {
    slug: 'perplexity-comet',
    name: 'Perplexity Comet · AI 浏览器',
    tagline: 'AI 原生的浏览器 · 让搜索变成对话',
    url: 'https://perplexity.ai/comet',
    category: 'consumer', logo: '🔮', logoColor: '#20B2AA',
    source: 'Product Hunt', score: 84,
    positioning: '重定义"浏览器 + 搜索"这个组合场景的下一代产品',
    painPoint: 'Chrome 搜索 → 逐条读结果 → 手工整合信息 —— 用户其实要"答案",不要"链接列表"',
    solution: '内置对话式搜索 + 页面理解 + Agent 操作能力,直接把用户问题变成一段综合回答,附带引用来源',
    designHighlight: '侧边栏对话流 + 主区网页 + 引用悬浮预览 · 支持"根据当前页问问题"',
    vibeCoding: '复现路径:Chromium fork + Perplexity API + 引用高亮渲染层。核心壁垒是搜索质量的模型 pipeline。',
    commercial: '免费下载 · Pro $20/月解锁 GPT-4o Search / Claude Opus / 高级 agent · 与 Anthropic 深度合作',
    consensus: 'AI 搜索质量当前最高 · 浏览器整合体验流畅 · 引用系统专业',
    criticism: '国内网络访问不稳 · 与 Google 生态不兼容 · agent 能力仍在早期',
    editorTake: "浏览器是所有 web 产品的入口,Perplexity 想从 Google 手里抢的不是搜索,而是用户的注意力路径。这个赌注很大。",
  },
];
type TL = { version: string; title: string; date: string; dateOrder: string; breakthrough: boolean; changes: string[]; capability: string; signal: string };

const TIMELINE: Record<string, TL[]> = {
  openai: [
    { version: 'GPT-5.3 Codex', title: 'AI 编码 SOTA 再刷新', date: '2026.07', dateOrder: '2026-07-01', breakthrough: true,
      changes: ['400K 上下文 · Codex 系列最新旗舰', 'Agent-style 长任务能力大幅提升'],
      capability: '当前 AI 编码的准 SOTA · 复杂重构任务更稳',
      signal: 'OpenAI 把编码线独立成品牌,不再是"通用模型顺便能写代码"' },
    { version: 'GPT-5.5', title: '中期迭代 · 长上下文 + Agent', date: '2026.06', dateOrder: '2026-06-01', breakthrough: false,
      changes: ['5.0 基础上做长上下文和 agent 优化', 'Pro 版专为深度推理场景'],
      capability: '推理能力与工具调用稳定性再上一档', signal: '高定价 Pro 版是 OpenAI 对"高价值任务愿意付高价"的赌注' },
    { version: 'GPT-5', title: '综合能力旗舰 · 分层价格', date: '2026.03', dateOrder: '2026-03-01', breakthrough: true,
      changes: ['nano/mini/pro 完整定价线', 'agent 场景默认选择'],
      capability: '综合场景 SOTA · 各价位都有对应型号', signal: 'OpenAI 从"一个爆款"变"一套产品线"' },
    { version: 'GPT o1', title: '推理时计算 · 思维链', date: '2024.09', dateOrder: '2024-09-01', breakthrough: true,
      changes: ['首次把"思考更久 = 答得更好"工程化', '数学与代码基准大幅提升'],
      capability: '数学、编码、复杂推理的 SOTA', signal: '整个行业跟着从"更大模型"转向"更长推理时间"' },
    { version: 'GPT-4o', title: '统一多模态 · 端到端语音', date: '2024.05', dateOrder: '2024-05-01', breakthrough: true,
      changes: ['首个统一处理文本/图像/音频的单一模型', '端到端语音延迟大幅降低'],
      capability: '语音交互场景默认选择', signal: '多模态不再是"多个模型拼接",而是原生一体化' },
    { version: 'GPT-4', title: '复杂推理与考试通过', date: '2023.03', dateOrder: '2023-03-01', breakthrough: true,
      changes: ['律考、SAT、GRE 等专业考试碾压'],
      capability: 'AI 从"聊天工具"变成"专业助理"', signal: '大厂开始严肃讨论 AI 治理和 alignment' },
    { version: 'ChatGPT (GPT-3.5)', title: '消费级 AI 起点', date: '2022.11', dateOrder: '2022-11-01', breakthrough: true,
      changes: ['免费 + 无门槛 + 惊艳体验 = 2 个月破亿用户'],
      capability: 'AI 第一次以产品形态触达大众', signal: '每个 PM 都在问:"我的产品要不要接 AI"' },
  ],
  anthropic: [
    { version: 'Claude Opus 4.8', title: '1M ctx · Computer Use 生产可用', date: '2026.05', dateOrder: '2026-05-01', breakthrough: true,
      changes: ['1M 上下文成为 Opus 标配', 'Computer Use 稳定至企业级', 'MCP 协议事实标准'],
      capability: '专业场景 SOTA · 长文档 + 屏幕操作双强', signal: 'Anthropic 在"AI 作为员工"方向定义了标准' },
    { version: 'Claude Opus 4.5', title: '专业向标杆', date: '2025.11', dateOrder: '2025-11-01', breakthrough: true,
      changes: ['Opus 系列高峰版本', 'MCP 协议生态初步成型'],
      capability: '专业写作、法律、科研的默认选择', signal: '专业场景开始向 Anthropic 倾斜' },
    { version: 'Claude Sonnet 4.5', title: '1M ctx · $3/M 编码 SOTA', date: '2025.10', dateOrder: '2025-10-01', breakthrough: false,
      changes: ['1M 上下文, 编码基准 SOTA'],
      capability: '开发者最爱 · Cursor / Windsurf 等 IDE 默认接入', signal: '性价比线拉平,Anthropic 有能力挑战 OpenAI 用户基本盘' },
    { version: 'Claude 4', title: 'Computer Use 首发', date: '2025.05', dateOrder: '2025-05-01', breakthrough: true,
      changes: ['首个能"控制电脑屏幕"的模型', '正式启动 Computer Use API'],
      capability: 'AI 从"回复文字"扩展到"帮你操作电脑"', signal: 'Agent 元年的实质性起点' },
    { version: 'Claude 3.5 Sonnet', title: 'Artifact 首创', date: '2024.06', dateOrder: '2024-06-01', breakthrough: true,
      changes: ['把"输出结果"从聊天流独立出来', '编码质量大幅超越 GPT-4o'],
      capability: '写代码、写文档的产品体验被重新定义', signal: '所有对话产品都开始跟进"Artifact 式"输出' },
    { version: 'Claude 3', title: '三分家族 · 定价分层', date: '2024.03', dateOrder: '2024-03-01', breakthrough: true,
      changes: ['首次把"能力"和"价格"做成 3 档产品线'],
      capability: '产品经理第一次觉得"Claude 值得认真评估"', signal: 'AI 模型开始有"产品分层"意识' },
    { version: 'Claude 1', title: 'Constitutional AI', date: '2023.03', dateOrder: '2023-03-01', breakthrough: false,
      changes: ['首次公开提出 Constitutional AI 训练方法'],
      capability: '在保守性和拒绝率上明显不同于 GPT', signal: 'AI 安全从边缘话题变成产品差异化' },
  ],
  google: [
    { version: 'Gemini 3.5 Flash', title: 'Flash 新一代', date: '2026.05', dateOrder: '2026-05-01', breakthrough: true,
      changes: ['价格进一步下探至 $0.15/M', '能力向 2.5 Pro 靠近'],
      capability: '大规模嵌入式 AI 默认选择', signal: 'Google 用"够用 + 便宜"占领长尾' },
    { version: 'Gemini 2.5 Pro', title: '长上下文旗舰', date: '2025.03', dateOrder: '2025-03-01', breakthrough: true,
      changes: ['1M+ 上下文标配', '首次在多个基准上追上 GPT-4o'],
      capability: 'Google 全家桶集成场景首选', signal: 'Google 让"用 Gemini"不再是妥协' },
    { version: 'Gemini 2.0 Flash', title: 'Deep Research 启动', date: '2024.12', dateOrder: '2024-12-01', breakthrough: true,
      changes: ['原生工具调用大幅优化', 'Deep Research 上线'],
      capability: '首个"研究型 Agent"商用样板', signal: '搜索 + AI 结合新范式,冲击传统搜索' },
    { version: 'Gemini 1.5 Pro', title: '百万上下文首发', date: '2024.02', dateOrder: '2024-02-01', breakthrough: true,
      changes: ['首个支持 1M 上下文的商用模型'],
      capability: '"整本书塞进去"场景第一次可行', signal: '重新定义"上下文"维度,触发行业追赶' },
    { version: 'Bard', title: 'Google 的应战', date: '2023.03', dateOrder: '2023-03-01', breakthrough: false,
      changes: ['LaMDA 后代模型', '首次公开出错被媒体嘲讽'],
      capability: '基础对话能力,不如 ChatGPT', signal: 'Google 意识到"技术领先 ≠ 产品领先"' },
  ],
  cursor: [
    { version: 'Cursor 2.0 · Composer 2', title: 'Background Agents 生产可用', date: '2026.05', dateOrder: '2026-05-01', breakthrough: true,
      changes: ['多 agent 并行长任务', '深度接入 Claude Opus 4.8'],
      capability: '"你去开会,让 AI 写完这个功能"场景成为现实', signal: 'AI 编码从"补全"进入"委派"' },
    { version: 'Cursor 1.0', title: '稳定商业化', date: '2025.02', dateOrder: '2025-02-01', breakthrough: true,
      changes: ['Composer 稳定, 团队订阅制成熟', '用户破百万'],
      capability: '独立开发者 IDE 商业化里程碑', signal: '证明"AI Native 产品"能挑战 Microsoft/Copilot' },
    { version: 'Cursor Composer', title: '多文件重构', date: '2024.10', dateOrder: '2024-10-01', breakthrough: true,
      changes: ['Cmd+I 一次让 AI 改多个文件', '直接看 diff, 一键接受'],
      capability: '重构级任务从"手写"变成"AI 做 + 我审阅"', signal: '编辑器的产品定义被重写' },
    { version: 'Cursor 0.1', title: 'VS Code fork MVP', date: '2023.04', dateOrder: '2023-04-01', breakthrough: false,
      changes: ['最初就是 VS Code + GPT API'],
      capability: '一个能"chat 编程"的编辑器 demo', signal: 'AI Native 编辑器赛道正式启动' },
  ],
  domestic: [
    { version: 'Kimi K2', title: '200K 上下文推理专用', date: '2026.07', dateOrder: '2026-07-01', breakthrough: true,
      changes: ['长文推理场景 SOTA', 'API 定价对标国际'],
      capability: '长文档分析、法律文书场景国内首选', signal: '国内厂商开始走"垂直场景性能领先"' },
    { version: 'Qwen 3 / Max', title: '通义千问 3 代 · 开源新高度', date: '2025.05', dateOrder: '2025-05-01', breakthrough: true,
      changes: ['Qwen3-Max 达到 GPT-4o 水平', '开源版本免费商用'],
      capability: '"能用的国产开源底座"达到国际主流', signal: '国内开源生态开始有真正的技术产出' },
    { version: 'DeepSeek V3 / R1', title: '推理性价比之王', date: '2025.01', dateOrder: '2025-01-01', breakthrough: true,
      changes: ['R1 推理链公开, 效果媲美 o1-mini', '定价只有对标产品 1/10'],
      capability: '"堪比 o1 · 便宜 10 倍"震动全行业', signal: '"中国 AI 追平"从口号变现实' },
    { version: '豆包 1.5 Pro', title: '语音口语场景专用', date: '2025.01', dateOrder: '2025-01-15', breakthrough: false,
      changes: ['中文口语交互延迟极低', '绑定抖音/剪映/飞书生态'],
      capability: '国内消费级 AI 场景闭环最完整', signal: '"从产品向 AI 靠拢"—— 反 OpenAI 路线的样板' },
    { version: 'Qwen 1.0', title: '通义千问首发', date: '2023.08', dateOrder: '2023-08-01', breakthrough: false,
      changes: ['阿里首个大规模开源的 LLM'],
      capability: '国内开源模型第一次严肃发布', signal: '"追 OpenAI"从口号进入实操' },
  ],
};

// ============================================================
// 执行 seed
// ============================================================
async function seed() {
  console.log('🌱 开始 seed...\n');

  // Teardowns
  const teardownRows = TEARDOWNS.map((t) => ({
    id: nanoid(),
    slug: t.slug,
    title: t.title,
    category: t.category,
    positioning: t.positioning,
    body: t.body,
    productUrl: t.productUrl || null,
    readTime: t.readTime || 12,
    isDomestic: t.isDomestic || false,
    authorName: 'AI Lens 编辑部',
    publishedAt: new Date(),
  }));
  await db.insert(teardowns).values(teardownRows).onConflictDoUpdate({
    target: teardowns.slug,
    set: { body: sql`excluded.body`, updatedAt: sql`excluded.updated_at` },
  });
  console.log(`✅ Teardowns: ${teardownRows.length} 篇`);

  // Articles
  const articleRows = ARTICLES.map((a) => ({
    id: nanoid(),
    slug: a.slug,
    title: a.title,
    category: a.category,
    excerpt: a.excerpt,
    body: a.body,
    readTime: a.readTime || 10,
    featured: a.featured || false,
    authorName: 'AI Lens 编辑部',
    publishedAt: new Date(),
  }));
  await db.insert(articles).values(articleRows).onConflictDoUpdate({
    target: articles.slug,
    set: { body: sql`excluded.body`, excerpt: sql`excluded.excerpt`, updatedAt: sql`excluded.updated_at` },
  });
  console.log(`✅ Articles: ${articleRows.length} 篇`);

  // Timeline
  const timelineRows: any[] = [];
  for (const [family, versions] of Object.entries(TIMELINE)) {
    for (const v of versions) {
      timelineRows.push({
        id: `${family}-${v.dateOrder}-${v.version.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
        family,
        version: v.version,
        title: v.title,
        dateLabel: v.date,
        dateOrder: new Date(v.dateOrder),
        breakthrough: v.breakthrough,
        changes: v.changes,
        capability: v.capability,
        signal: v.signal,
      });
    }
  }
  await db.insert(timelineVersions).values(timelineRows).onConflictDoUpdate({
    target: timelineVersions.id,
    set: {
      title: sql`excluded.title`,
      changes: sql`excluded.changes`,
      capability: sql`excluded.capability`,
      signal: sql`excluded.signal`,
      updatedAt: sql`excluded.updated_at`,
    },
  });
  console.log(`✅ Timeline: ${timelineRows.length} 个版本条目`);

  // Daily Picks(精选,已完成 6 维,发布态)
  const picksRows = PICKS.map((p) => ({
    id: nanoid(),
    slug: p.slug,
    name: p.name,
    url: p.url,
    tagline: p.tagline,
    category: p.category,
    logo: p.logo,
    logoColor: p.logoColor,
    source: p.source,
    score: p.score,
    pickedAt: new Date(),
    positioning: p.positioning,
    painPoint: p.painPoint,
    solution: p.solution,
    designHighlight: p.designHighlight,
    vibeCoding: p.vibeCoding,
    commercial: p.commercial,
    consensus: p.consensus,
    criticism: p.criticism,
    editorTake: p.editorTake,
    isDraft: false,
  }));
  await db.insert(dailyPicks).values(picksRows).onConflictDoUpdate({
    target: dailyPicks.slug,
    set: {
      positioning: sql`excluded.positioning`,
      painPoint: sql`excluded.pain_point`,
      solution: sql`excluded.solution`,
      designHighlight: sql`excluded.design_highlight`,
      vibeCoding: sql`excluded.vibe_coding`,
      commercial: sql`excluded.commercial`,
      consensus: sql`excluded.consensus`,
      criticism: sql`excluded.criticism`,
      editorTake: sql`excluded.editor_take`,
      isDraft: sql`excluded.is_draft`,
      updatedAt: sql`excluded.updated_at`,
    },
  });
  console.log(`✅ Daily Picks: ${picksRows.length} 篇精选(已填 6 维)`);

  console.log('\n🎉 seed 完成!');
  console.log(`  拆解 ${teardownRows.length} · 长文 ${articleRows.length} · 时间轴 ${timelineRows.length} · 精选 ${picksRows.length}`);
  console.log('\n👉 刷新首页 http://localhost:3000 看数据统计更新');

  process.exit(0);
}

seed().catch((e) => {
  console.error('❌ seed 失败:', e);
  process.exit(1);
});
