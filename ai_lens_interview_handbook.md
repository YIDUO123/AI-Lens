# 📘 AI Lens 项目全手册

> **文档定位:** 项目负责人面试全手册 · 从零到成品 · 从代码到决策 · 从数据到反思
> **适用对象:** 项目负责人(产品经理身份)· 面试场景使用
> **生成方式:** 基于 AI Lens 项目**当前生产代码 + 上线数据 + 开发历史**
> **风格:** 通俗友好 · 面试导向 · 关键点已加粗 · 每模块尾部有"3 句速记"
> **诚实基线:** 所有数字来自生产 DB 真实数据 · 不虚构 · 不夸大 · 有信息缺失明标"待补"

---

# 🧭 模块 1 · 产品全景与用户全路径

## 1.1 产品基本面(30 秒开场)

| 维度 | 内容 |
|-----|------|
| **一句话定位** | AI Lens 是一个**独立 AI 情报站** · 主张 "**不做信息瀑布 · 做信息滤镜**" —— 每天从 30+ 公开信源里过滤 200+ 条 AI 动态 · 用结构化框架二次分析 · 输出个人可信的 PM 视角内容。 |
| **核心价值** | 帮 AI 产品经理 / 独立开发者 / AI 学习者 · 从 "看得多" 变成 "**看得懂**" · 免费获得投研报告级的 AI 内容分析 |
| **目标用户** | 3 类:AI 从业者(PM/Dev/Researcher)· 想入门 AI 的学生/转行者 · 普通职场读者 |
| **核心差异化** | ① 结构化 6 维拆解框架  ② 4 通道 AI 兜底 · 全免费运营  ③ 1 人 Vibe Coding 从 0 到生产级  ④ 独立观点 · 有署名 · 不做 AI 口水文 |

## 1.2 四大内容模块的价值分工 【面试高频】

| 模块 | 用户价值 | 定位差异 | 更新频率 |
|------|---------|--------|---------|
| **每日 AI 资讯**(/news) | **广度** · 让用户不错过任何行业动态 | 快速扫全网 · 30+ 信源自动聚合 | 每 30 分钟 |
| **每日创投精选**(首页 + /teardowns) | **热度** · 一天挑一款 AI 新品聚焦看 | HN Top 抓取 + AI 生成 6 维拆解 | 每天 |
| **深度产品拆解**(/teardowns/[slug]) | **深度** · 一次搞懂一款 AI 产品 | 6 维投研报告 · 编辑手工创作 | 不定期(有大产品出就写) |
| **模型代际演化**(/timeline) | **纵深** · 追每个 AI 家族完整弧线 | 5 大家族时间线 · 突破性版本星标 | 有新版本时手工加(admin 表单) |
| **独立洞察长文**(/insights) | **观点** · PM 视角行业思考 | 有署名的独立评论 · 不是聚合 | 不定期 |

**面试话术:**
> "AI 时代最贵的东西是**注意力** · 但市场上要么是**信息瀑布**(资讯堆量 · 不做分析)· 要么是**付费墙**(内容深但门槛高)。AI Lens 用 4 个模块解决 4 个不同深度的需求:资讯扫广度 · 精选看热度 · 拆解学深度 · 长文看观点。"

## 1.3 完整用户旅程(4 类用户 × 5 个节点)

### 【游客访问路径】

```
① 访问 https://ailens.cloud
    ↓ 用户动作:输入域名 或 从小红书链接进
    ↓ 产品反馈:首页 400-800ms 打开 · Cloudflare HK 缓存 · 全球 CDN
    ↓ 核心价值:第一屏"看得多不如看得懂" + 实时资讯滚动 + 4 大模块入口
    ↓ 可能流失点:首屏慢(中国北疆/西藏偏远地区)· 或误以为是营销号

② 浏览内容
    ↓ 动作:点入 /news 或 /teardowns · scroll 浏览
    ↓ 反馈:结构化卡片 · 6 维拆解可展开 · 品牌感强
    ↓ 价值:每篇内容都是"读一次就懂一款产品"
    ↓ 流失点:内容量少(目前 13 长文 · 9 拆解)· 用户会觉得"还没写多少"

③ 首次互动(需登录)
    ↓ 动作:想点赞 / 收藏 / 评论 · 触发登录门槛
    ↓ 反馈:跳转 /sign-in · GitHub OAuth 一键登录
    ↓ 价值:0 障碍绑定(无密码 · 无邮箱验证)
    ↓ 流失点:不想登 GitHub 的用户会离开(未接入微信/邮箱本地登录扩展)

④ 订阅周报(不需要登录)
    ↓ 动作:首页/长文页底部填邮箱
    ↓ 反馈:立即"订阅成功 · 每周日晚 8 点发信"
    ↓ 价值:主动召回 · 建立弱关系
    ↓ 流失点:担心垃圾邮件(未做二次确认 · 但有一键退订链接)

⑤ 持续回访
    ↓ 动作:收到周报 · 点里面链接 · 回访某篇长文
    ↓ 反馈:UTM tracking 生效(未来加)· 邮件 CTR 可测
    ↓ 价值:形成"每周一次刷 AI Lens" 的习惯
    ↓ 流失点:如果周报内容太单薄 · 会退订
```

### 【创作者路径】(admin/editor)

```
登录 → /admin 仪表盘
    ↓ 5 个编辑器:每日精选(6 维 + AI 兜底) · 洞察长文(Markdown 双栏) · 产品拆解(Markdown 双栏) · 时间线(表单) · URL 采集器
    ↓ AI 辅助:一键生成 6 维 · 一键润色选段 · 一键生成摘要 · 图片粘贴上传
    ↓ 发布:直接推送到公开页 · 3 层缓存自动清
    ↓ 监控:/admin/analytics 看 AI 成功率 · 事件流 · Top 内容
```

## 1.4 核心功能清单(前台 + 后台)【面试高频】

### 前台(游客/普通登录用户)

| 功能 | 输入 | 触发条件 | 输出 | 更新频率 |
|-----|------|--------|------|---------|
| 首页 4 大模块入口 | 无 | 打开 `/` | 4 张卡 · 数字动态从 DB 读 | 缓存 5 分钟 |
| AI 资讯页 | 分类/tab 参数 | 打开 `/news` | 200+ 条资讯 · 按分类过滤 | 30 分钟自动 |
| 每日创投精选卡 | 无 | 打开 `/teardowns` | 12 张 6 维分析卡 | 每日 8:21 抓 |
| 深度拆解详情 | slug | 点入拆解 | Markdown 长文 · 附点赞收藏评论 | 手工发 |
| 模型时间线 | family 参数 | 打开 `/timeline` | 5 家族并列 · 按日期倒序 | 手工加 |
| 洞察长文 | slug | 点入长文 | Markdown + AI Lens 编辑视角 | 手工发 |
| 排行榜 | 无 | 打开 `/leaderboard` | 3 榜合一(热/阅读/讨论)· 每小时刷 | 每小时缓存 |
| 全站搜索 | q 参数 | 提交 form | 4 类内容命中结果 | 实时 |
| 邮件订阅 | email | 提交表单 | 订阅成功 · 每周日发信 | 立即入库 |
| 点赞 / 收藏 | 内容 id | 已登录点按钮 | 计数 +1 · 本地状态更新 | 立即 |
| 评论 | 内容 body | 已登录发评论 | 直接展示 · 支持回复树 | 立即 |
| 个人主页 | 无 | 登录后打开 `/me` | 我的收藏/点赞/评论 · 可折叠 | 立即 |

### 后台(admin/editor)

| 功能 | 输入 | 触发条件 | 输出 | 更新频率 |
|-----|------|--------|------|---------|
| /admin 仪表盘 | 无 | 登录 admin | 内容统计 + 5 编辑器入口 + 数据面板 | 每次刷新 |
| **每日精选编辑器** | pick id | 点进单条 | 6 维 + 3 观点填写 · 支持 AI 兜底 + 批量删 | 立即入库 |
| **洞察长文编辑器** | article id | 点进单条 | Markdown 双栏 + 3 秒自动保存 + AI 润色/摘要 + 图片粘贴 | 立即 |
| **产品拆解编辑器** | teardown id | 点进单条 | 同上 + 5 种分类 + 国产标记 | 立即 |
| **时间线快速添加** | 表单字段 | 提交表单 | 直接入 timeline_versions 表 · 前台立刻显示 | 立即 |
| **URL 采集器** | URL 字符串 | 点"抓取" | Jina Reader 抓正文 + OG 元数据 · 存为 external article | 立即 |
| **数据面板** | 无 | 打开 `/admin/analytics` | AI 通道分布 + 事件分布 + Top 内容 + 事件流 raw | 每次刷新 |
| 批量删除 | id 数组 | 复选 + 点批量删 | 同类记录一起删 · 3 个列表页都支持 | 立即 |
| 头像上传 | image file | `/me` 点头像 | 客户端 200×200 压缩 · Vercel Blob 存 | 立即 |

## 1.5 【3 句速记 · 用于面试开场】

1. **"AI Lens 是我一人做的独立 AI 情报站 · 不做信息瀑布 · 做信息滤镜 · 上线 30 天 · 域名 ailens.cloud"**
2. **"4 大内容模块解决 4 层需求 · 每日资讯扫广度 · 每日精选看热度 · 产品拆解学深度 · 洞察长文看观点"**
3. **"用户旅程从匿名浏览 → GitHub 一键登录互动 → 邮箱订阅 → 每周日召回 · 全免费无付费墙"**

---

# 🛠 模块 2 · 技术栈全景(小白友好版)

## 2.1 分层技术栈说明

### 【前端层】

| 技术 | 大白话解释 | 为什么选它 | 换成别的行不行 |
|------|-----------|-----------|-------------|
| **Next.js 15 App Router** | 一个能让网页**同时前端后端一起写**的框架 · 你写一个页面既能渲染 UI · 也能查数据库 | React 生态最主流 · **Vercel 原生**部署一键完成 | 换 Nuxt(Vue 版)或 Remix 都行 · 但生态不如它 |
| **React 19** | 让网页**局部刷新**的库 · 用户点按钮页面不用整个重载 | 招聘市场最大 · 组件复用友好 | 换 Vue 也行 · 但 Next.js 强绑 React |
| **TypeScript** | 给 JavaScript 加**类型检查** · 写错变量类型编辑器立即报错 | 少一半 bug · 面试加分项 | 纯 JS 也能跑 · 但大项目容易出 bug |
| **Tailwind CSS** | 用**预制类名**写样式 · 不用另写 CSS 文件 | 开发速度提升 3 倍 · 迭代 UI 快 | 换 CSS Modules 也行 · 但慢 |
| **shadcn/ui** | 一堆**可复制粘贴**的高质量组件(按钮/卡片/对话框)· 不装 npm 包 | 完全可定制 · 无版本锁定 | 换 MUI/Ant Design 也行 · 但难改样式 |

### 【后端层】(其实和前端在一个项目里)

| 技术 | 大白话解释 | 为什么选它 |
|------|-----------|-----------|
| **Next.js Server Components** | 页面在**服务器**上先生成 HTML · 用户拿到就是完整的页 | SEO 友好 · 首屏快 · 不用另建 API |
| **Server Actions** | 页面里直接写"提交后调用的函数" · 不用手写 API 路由 | 前后端**同一个函数** · 类型自动同步 |
| **Route Handlers** | 传统 API 路由 · 用来处理 Webhook / Cron / 上传等 | 复杂逻辑必要 |
| **Better Auth** | 一个**开箱即用**的登录框架 · 5 分钟接 GitHub OAuth | 比 NextAuth 更轻 · 类型更好 |

### 【数据存储层】

| 技术 | 大白话解释 | 为什么选它 | 换成别的 |
|------|-----------|-----------|--------|
| **Supabase Postgres** | 云托管的**关系型数据库** · 有免费 500MB | 免费额度大 · 一键 dashboard 查表 · 内置认证/存储 | 换 Neon/Xata 都行 · 但生态没这个全 |
| **Drizzle ORM** | 让你**用 TypeScript 写 SQL** · 类型自动推导 · 无 runtime 开销 | 类型全 · 学习成本比 Prisma 低 | 换 Prisma 也行 · 稍重 |
| **Vercel Blob** | 存**图片文件**的对象存储 · 有全球 CDN | 一行代码上传 · 全球加速 | 换 R2/S3 也行 · 但要自己配 |

### 【AI 能力层】【面试高频】

| 技术 | 大白话解释 | 为什么选它 |
|------|-----------|-----------|
| **DeepSeek Chat** | 国产大模型 · 中文强 · 便宜(¥1/百万 token) | 首选主力 · 但需要充值 |
| **智谱 GLM-4-Flash** | 国产 · **完全免费无限次** · 中文尚可 | **现在的主力** · 0 成本 |
| **Groq (Llama-3.3-70B)** | 美国 · 速度极快(<1s)· 免费 14400 请求/日 | 速度最快 · 但中文一般 |
| **Google Gemini Flash Latest** | 谷歌免费 tier · 中文可用 · 但常 503 | 最后兜底 |
| **Jina Reader (r.jina.ai)** | 免费 URL 抓正文成 Markdown 的服务 | URL 采集器用它抓 CSDN 之外的内容 |

### 【部署运维层】

| 技术 | 大白话解释 | 为什么选它 |
|------|-----------|-----------|
| **Vercel Hobby** | Next.js 母平台 · **免费** 部署 · 每次 push 自动上线 | 一键部署 · SSL 自动 |
| **Cloudflare(免费)** | 免费的 **CDN + DNS + 代理** · 全球边缘节点 | **中国 92% 用户秒开的关键** |
| **GitHub Actions** | 免费的**定时任务**平台 · 每 30 分钟自动跑 curl | Vercel Hobby 只能日频 · GitHub 每分钟都行 |
| **Resend** | 邮件发送服务 · 免费 3000 封/月 | 一行代码发信 · 送达率高 |

## 2.2 整体架构流程图(文字描述)

```
用户敲 https://ailens.cloud 回车
   │
   ├─(1) DNS 查询 · Cloudflare 返回自己的 IP(不是 Vercel 的)
   │
   ├─(2) 请求到 Cloudflare HK 节点(距离中国用户 <100ms)
   │       ├─ 缓存命中?→ 直接返回 HTML(100-300ms 端到端)
   │       └─ 未命中 → 走 Cloudflare 专线到 Vercel 美国
   │
   ├─(3) Vercel Edge Network 接住 · 分派到 serverless 函数
   │
   ├─(4) Next.js Server Component 执行
   │       ├─ 查 Supabase Postgres(资讯 + 长文 + 拆解)
   │       ├─ 查 unstable_cache 二级缓存(热点直接命中)
   │       └─ 组装 HTML + RSC payload
   │
   ├─(5) HTML 返回给 Cloudflare · 缓存 5 分钟 · 转发给用户
   │
   └─(6) 用户浏览器渲染 · React 水合 · 首屏可交互
```

**关键点讲给面试官(不用讲细节):**
- "**Cloudflare 前置**是中国用户能秒开的关键 · 因为它在 HK 有节点 · 且不像 Vercel 那样被 GFW 概率性拦截"
- "**Server Component**让服务器直接吐 HTML · 首屏 SEO 友好 · 不像 SPA 需要等 JS 加载"
- "**unstable_cache**让公开数据(资讯列表 · Top 长文)缓存 5 分钟 · 100+ 用户看同一页只查 1 次 DB"

## 2.3 开发模式:Vibe Coding · 人机边界 【面试高频】

### 什么是 Vibe Coding?
> 用**自然语言 + AI 助手**(如 Claude Code)在人类**核心决策 · 边界把关**下 · 让 AI 生成 90%+ 的代码。

### AI Lens 项目里的分工

| 事项 | 人负责 | AI 负责 |
|-----|-------|-------|
| **产品定位 · 需求边界** | ✅ 100% | ❌ 不参与 |
| **UI/UX 设计原则** | ✅ 定"Brutalist + 珊瑚色 + 大字体" | AI 按原则实施 |
| **技术选型** | ✅ 定"Next.js + Supabase + 4 通道 AI" | AI 提建议 · 人拍板 |
| **具体代码实现** | ⚠️ 审阅 + 提修改 | ✅ 90%+ AI 写 |
| **调试 · 定位 bug** | ✅ 描述现象 | AI 猜原因 · 人验证 |
| **数据库表设计** | 定字段范围 | AI 补细节 |
| **文案 / 内容** | ✅ 100%(6 维分析 · 长文观点) | 只做润色 |

### **人的边界(不能让 AI 越界的地方)**

- ⛔ 产品价值判断
- ⛔ 用户需求真伪
- ⛔ 敏感数据处理(GDPR / PII)
- ⛔ 商业模式选择

## 2.4 【面试考点标注】

| 考点 | 面试频率 | PM 应该讲到什么深度 |
|-----|--------|-----------------|
| 为什么用 Next.js 而不是 Vue/Angular | ⭐⭐⭐ | 知道"服务端渲染 + Vercel 原生"就够 |
| Supabase vs 自建 Postgres | ⭐⭐ | "省心 + 免费"就好 · 不用细讲 |
| 4 通道 AI Fallback 架构 | ⭐⭐⭐⭐⭐ | **重点** · 会画链路图 · 会说 P95 数字 |
| Cloudflare 前置 vs 直连 Vercel | ⭐⭐⭐ | 讲"90% 中国用户秒开" 数据 |
| Vibe Coding 边界 | ⭐⭐⭐⭐ | **不能吹 AI 全干** · 明确人做决策 |

## 2.5 【3 句速记】

1. **"技术选型:Next.js 15 · React 19 · Supabase · 4 通道 AI · Vercel + Cloudflare CDN · 全免费"**
2. **"架构核心:Cloudflare HK 前置 → Vercel Edge → Server Component → Supabase · Server Actions 免写 API"**
3. **"Vibe Coding 里 · 我做决策 + 边界 + 审阅 · AI 生成 90%+ 代码 · 不是 AI 全干"**

---

# 🌊 模块 3 · 核心数据流转与 AI 处理链路

## 3.1 资讯数据全流水线【面试高频 · 完整链路】

```
[外部信源]
    ├─ AI 咨询 API(aihot.virxact.com · 聚合了 30+ RSS / 官方)
    ├─ HackerNews API(公开)
    ├─ Product Hunt(官方 RSS)
    └─ 各 AI 公司 blog(OpenAI · Anthropic 等)
        │
[抓取层]  ↓ GitHub Actions 每 30 分钟触发
        │  curl https://ailens.cloud/api/cron/news
        │  ↓
        │  lib/fetchers/news.ts
        │    · fetch 各源 · 500 条/次
        │    · 简单 filter(去掉明显广告)
        │
[去重层]  ↓ DB upsert with unique(source, external_id)
        │  · onConflictDoNothing · 已存在就跳过
        │  · 单日重复率 <5%
        │
[结构化] ↓ 直接 mapping · 无 AI 参与(为了省 token)
        │  · title/url/source/category/published_at
        │  · category 由源 tag 映射(ai-models/products/industry/paper/tip)
        │
[入库]   ↓ INSERT INTO news_items
        │
[展示]   ↓ /news 页 SSR 查 top 50 latest · Cloudflare 5 分钟缓存
```

**失败兜底:**
- **抓取失败**:GitHub Actions 每 30 分钟重试 · 单次挂掉 · 下次自动补
- **去重冲突**:onConflictDoNothing · 无异常
- **源接口挂**:某个源挂了不影响其他源 · Promise.allSettled 隔离

## 3.2 AI 处理核心逻辑【面试高频】

### AI 被调用的 4 个场景

| 场景 | 触发点 | 目标 |
|-----|-------|------|
| **6 维分析生成** | 点每日精选的"AI 兜底填写" | 生成 pick 的 9 字段(6 维 + 3 观点) |
| **长文润色** | 编辑器选中一段 · 点魔杖 | 让粗糙初稿更专业 |
| **摘要生成** | 编辑器点 ✨ 生成摘要 | 从正文提炼 60-100 字 excerpt |
| **URL 采集** | 采集器输入 URL | Jina Reader 抓正文 · 无 LLM(直接结构化) |

### Prompt 设计框架(以 6 维分析为例)

```
【角色】你是资深 AI 产品经理 · 为独立媒体 "AI Lens" 写产品拆解

【上下文】
产品:${pick.name}
一句话:${pick.tagline}
分类:${pick.category}
官网:${pick.url}

【任务约束】
1. 输出严格 JSON · 不要 markdown 代码块包裹
2. 每字段 40-100 字中文 · 有具体判断不空话
3. 字段名固定:positioning / painPoint / solution / designHighlight
                 / vibeCoding / commercial / consensus / criticism / editorTake

【输出示例格式】(JSON 已在 prompt 里给)
```

**核心约束:**
- ✅ **JSON response_format**(DeepSeek/OpenAI/Zhipu 都支持)· 保证解析不会崩
- ✅ **字段名固定**(9 字段)· 前端 template 化
- ✅ **temperature=0.6**(平衡创造性 + 稳定性)
- ✅ **maxTokens=4096**(避免中文被截断)· 我们踩过 2048 被砍的坑

### 内容降噪 / 去重 / 分类

- **降噪**:目前没做主动降噪 · 靠源本身筛(如 HN Top 已是社区筛过的)
- **去重**:DB 层 unique(source, external_id) · 靠外部 id
- **分类**:靠源 tag mapping · 无 AI(为省 token)· **未来考虑加 LLM 自动打标**(待补)

## 3.3 质量管控机制

| 层 | 谁做 | 判断标准 |
|---|-----|--------|
| **抓取** | 完全 AI/程序 | 源本身可信度 |
| **结构化** | 程序 | 字段完整性 |
| **AI 兜底 6 维** | AI 生成 → **人工审** | 6 维每维 40-100 字 · admin 点"保存并发布"才上线 |
| **长文观点** | 100% 人写 | 我的名字署 · 出错我负责 |

**人工校准分工边界:**
- AI 生成的 6 维:**默认草稿状态** · 需要 admin 点"保存并发布"才上线(见 `/admin/picks/[id]/pick-editor.tsx`)
- 兜底文案不合格:直接改 · 或点"AI 兜底填写"重新生成 · 或删除

## 3.4 【3 句速记】

1. **"数据从 30+ 公开信源来 · GitHub Actions 每 30 分钟抓 · Supabase 存 · Cloudflare 5 分钟缓存吐"**
2. **"AI 只做 3 件事:6 维分析生成 · 长文润色 · 摘要生成 · 全部 JSON 输出 · 字段名固定"**
3. **"质量靠人机分工:AI 生成 → 默认草稿 → admin 审核 → 手动发布 · 长文 100% 人写"**

---

# 📊 模块 4 · 埋点体系与数据指标体系

## 4.1 现有埋点盘点

### 【自动采集层 · Vercel 官方】

| 埋点 | 位置 | 触发条件 | 事件 | 衡量指标 |
|------|-----|--------|------|--------|
| Vercel Analytics | `<Analytics />` in layout | 每次页面加载 | pageview | PV/UV/国家/引荐来源 |
| Vercel Speed Insights | `<SpeedInsights />` | 每次页面加载 | Web Vitals | LCP/FCP/CLS/TTFB/INP |

### 【业务表层 · 每个行为一行】

| 埋点 | 表.字段 | 触发时机 | 衡量 |
|------|--------|--------|------|
| 阅读量 | `articles.view_count` / `teardowns.view_count` | 详情页 mount(ViewBeacon 组件) | 单篇热度 |
| 点赞 | `likes` 表(每次一行) | 已登录用户点心 | 内容质量信号 |
| 收藏 | `saves` 表 | 已登录用户点书签 | 内容持久价值 |
| 评论 | `comments` 表 | 已登录用户发评论 | 讨论热度 |
| 订阅 | `newsletter_subscribers` 表 | 邮箱表单提交 | 拉新漏斗 |

### 【自建分析层 · 专门为面试/复盘做的】

| 埋点 | 表 | 触发 | 衡量 |
|------|---|-----|------|
| **AI 调用日志** | `ai_call_logs` | `generateWithAI()` 内部每次通道调用 | AI 兜底成功率 · P95 延迟 · fallback 有效性 |
| **通用事件流** | `user_events` | 服务端 `logEvent()` + 客户端 `track()` | 订阅漏斗 · 搜索命中率 |
| **月度归档** | `analytics_monthly_snapshots` | GitHub Actions 每月 1 号 | 跨月对比 · Vercel 30 天数据消失前的备份 |

**已实际埋的 event_name(5 类):**
- `newsletter_subscribe`(客户端 27 + 服务端 20 = 47 条)
- `newsletter_resubscribe`(0 条 · 无退订又订阅)
- `newsletter_subscribe_fail`(0 条 · 无提交失败)
- `search_submit`(20 条 · 含 hash + length + result_count)
- 未来可加:content_view · image_upload · editor_publish · signup_success

## 4.2 指标体系搭建

### 【北极星指标】

> **每周活跃订阅者数**(WAP = Weekly Active Subscribers)
>
> **口径:** 过去 7 天内 · 邮件周报送达并被点开链接的订阅者数
>
> **为什么选它:** AI Lens 的核心价值是"帮用户长期跟 AI 前沿" · **周报是唯一召回渠道** · 只有周报能被打开 · 用户才真正"回到网站" · 才有商业化的可能

### 【二级指标 · 4 维度】

#### 用户增长
- **UV**(每日独立访客 · Vercel Analytics)
- **新访客占比** = 新 UV / 总 UV(反映拉新健康度)
- **来源分布** = 小红书 / 直接 / 引荐 各占多少

#### 内容消费
- **PV 均值** = 总 PV / 总 UV(反映浏览深度)
- **阅读率** = 有 content_view 的 UV / 总 UV
- **深读率** = 滚到 95% 的次数 / content_view 次数(待补 · 需加 scroll_end 埋点)
- **平均阅读时长**(待补)

#### 用户留存
- **7 日回访率** = 7 天内又回来的 UV / 7 天前的新 UV
- **30 日回访率** 同上
- **邮件订阅率** = newsletter_subscribe / UV

#### 订阅转化
- **订阅漏斗** = 首页 UV → 曝光订阅表单 → 点击订阅 → 完成
- **邮件打开率** = 收信 UV / 发信总数(Resend 后台可查)
- **邮件 CTR** = 点邮件链接的 UV / 打开邮件的 UV
- **退订率** = 退订数 / 累计订阅

### 【数据分析方法】

| 场景 | 看什么 |
|-----|-------|
| 日常状态 | Vercel Analytics 面板 · UV / 引荐 |
| AI 稳定性 | Supabase SQL · ai_call_logs 成功率 |
| 内容表现 | Top 5 articles/teardowns 阅读量 |
| 增长健康度 | 新增订阅数走势 · 7 日回访率 |
| **异常需优先排查** | AI 成功率 < 95% · Vercel Speed LCP > 3s · newsletter 送达率 < 90% |

## 4.3 补充建议(3-5 个应该加的埋点)

| 补充埋点 | 理由 | 业务价值 |
|---------|-----|--------|
| **content_view** 客户端 track | 现有 viewCount 是纯计数 · 没 session/来源 | 能知道 "这篇文章 · 从小红书来的用户看了多久" |
| **content_scroll_end** | 只知开始看 · 不知看完了 | 计算深读率 · 判断内容质量 |
| **signup_success** | 现在没埋 · 只能靠 user.created_at 反推 | 分析注册漏斗转化 |
| **editor_publish** | 我发布长文的效率数据 · 简历用 | "1 人月产出内容 X 篇" |
| **email_click_through** | Resend 邮件里加 UTM · 追踪回访 | 算真实 CTR · 优化周报内容排布 |

## 4.4 【3 句速记】

1. **"3 层埋点 · Vercel 自动采 PV/UV · 业务表存互动 · 自建 ai_call_logs + user_events 存高价值"**
2. **"北极星指标是 WAP(周活跃订阅者)· 因为周报是唯一召回渠道"**
3. **"AI 调用成功率 · 邮件 CTR · 7 日回访率 · 三个数字异常就要排查"**

---

# 🤖 模块 5 · AI 能力核心细节【面试高频深挖区】

## 5.1 模型选型清单

| 模型 | 业务场景 | 成本 | 效果 | 速度 | 适配性 | 为什么选它(而不是竞品) |
|-----|--------|-----|-----|-----|-------|-------------------|
| **智谱 GLM-4-Flash** | 主力 · 6 维 + 润色 + 摘要 | 免费无限 | ⭐⭐⭐⭐ 中文强 | 15-25s(慢)| 中文任务 | **免费无限**是核心 · 独立开发者零成本运营 |
| **DeepSeek Chat** | 备用主力(充值后) | ¥1/百万 token 极便宜 | ⭐⭐⭐⭐⭐ 中文最强 | 快 · 3-8s | 中文推理 | 中文任务综合最强 · 但需要充值 |
| **Groq (Llama-3.3-70B)** | fallback 3 | 14400 请求/日免费 | ⭐⭐⭐ 中文一般 | ⚡ 快 · <1s | 英文任务 | 速度最快 · 兜底最后一步(中文效果一般) |
| **Google Gemini** | fallback 4 | 1500 请求/日免费 | ⭐⭐⭐ 中文可用 | 5-10s | 一般任务 | 备胎的备胎 · 常 503 |

### 为什么用 Zhipu 做内容解析而不是 GPT?
- **成本**:Zhipu 免费无限 · GPT-4 $2.5/百万 input tokens
- **效果**:中文任务 Zhipu vs GPT-4 差距不大 · 但成本 100 倍
- **速度**:GPT-4 API 稳定 <5s · Zhipu 15-25s · 但**独立开发者用户能等**
- **场景适配**:AI Lens 是内容媒体 · 非实时对话 · **慢一点没关系** · 免费更重要

## 5.2 Prompt 工程核心方法

### 4 大原则
1. **明确角色**:"你是资深 AI 产品经理" > "写个分析"
2. **强约束输出格式**:JSON schema · 字段名固定 · 每字段字数限制
3. **提供上下文**:产品名 + 一句话 + 分类 + 官网(4 条)· 避免 AI 瞎猜
4. **反例警示**:"不要 markdown 代码块包裹"(踩过被 ```json 包裹解析失败的坑)

### 6 维分析 Prompt 框架(**面试高频**)

```
【角色】你是资深 AI 产品经理 · 为独立媒体"AI Lens"写产品拆解

【任务】对下面这个产品做 6 维分析

【上下文】
产品:${name}
一句话:${tagline}
分类:${category}
官网:${url}

【输出格式】请输出严格的 JSON · 不要 markdown 代码块包裹。字段如下 · 每个字段 40-100 字中文 · 有具体判断不空话:
{
  "positioning": "定位 · 一句话讲清产品在赛道里的位置",
  "painPoint": "痛点 · 它解决什么真实需求, 用户之前怎么处理",
  "solution": "产品解法 · 核心机制",
  "designHighlight": "设计亮点 · 交互/UX 上别人没做到的地方",
  "vibeCoding": "Vibe Coding 灵感 · 独立开发者用 Cursor + Claude + MCP 如何快速复现 MVP",
  "commercial": "商业价值 · 定价 · 目标用户 · 天花板",
  "consensus": "用户共识 · 基于产品定位推断",
  "criticism": "用户质疑 · 基于产品定位推断",
  "editorTake": "AI Lens 编辑观点 · PM 视角这个产品值得学什么, 或它揭示什么行业信号(70-120 字)"
}

只输出 JSON。
```

### 优化迭代思路(踩过的坑)
- **v1** 用了 markdown 代码块包裹 → JSON.parse 失败 → 加 "不要 markdown 代码块包裹"
- **v2** maxTokens=2048 中文被截断 → 加到 4096 · 结构化输出保证下限
- **v3** JSON 字段偶尔漏 → response_format=json_object 强约束
- **v4** 中文太长/太短不稳 → 加"40-100 字"具体范围

## 5.3 效果评估体系【面试可讲的坦诚】

### 目前**没做**量化评估的原因(坦诚)
- 内容质量**主观性强** · 6 维每维 40-100 字合格与否 · 无客观 metric
- N=4 样本还太小 · 建评估集不划算
- 独立项目**依赖直觉** + admin 审核 · 而不是 A/B

### Bad Case 处理流程
1. AI 生成 6 维 → admin 打开 pick 详情页看
2. 觉得**不好** → 3 选 1:
   - 手动改
   - 点"AI 兜底填写"重新生成
   - 直接删掉这条 pick
3. 觉得**好** → 点"保存并发布"

### 未来量化评估路径(待补)
- 建 20-50 个 golden case(手写"完美 6 维")
- 每次 prompt 优化后跑 golden case · 用另一个 LLM 打分
- 分数下降就回滚 prompt

## 5.4 边界与局限性(**坦诚 · 面试加分**)

| 短板 | 容易出错场景 | 目前应对 |
|-----|-----------|--------|
| **中文长文润色偶尔"翻译腔"** | Zhipu 有时输出像翻译 · 不地道 | 未来切主力到 DeepSeek |
| **6 维分析对小众产品不准** | 冷门 AI 产品训练数据少 · AI 会瞎编 | admin 审核兜底 |
| **响应时间 15-25s** | 用户点 AI 兜底后要等 15-25s | 已加 loading UI · 未来考虑流式返回 |
| **无量化评估** | 全靠 admin 直觉判断 | v2 建 golden case 集 |
| **AI 无法自主分辨"这是真新闻还是软文"** | 资讯来源被公关污染 | 目前不做鉴别 · 靠源本身可信度 |

## 5.5 【3 句速记】

1. **"4 通道 fallback · 智谱主力(免费无限)· DeepSeek 备主力(便宜强)· Groq 快 · Gemini 兜底"**
2. **"Prompt 4 原则:明确角色 · 强约束 JSON · 提供上下文 · 反例警示"**
3. **"评估靠 admin 直觉 + 手动审核 · 未来加 golden case · 现在坦诚说 N 小样本"**

---

# 🚨 模块 6 · 异常处理与兜底机制

## 6.1 常见故障场景清单(10 种)

| # | 故障 | 现象 | 原因 | 排查 | 修复 | 自动降级 |
|---|-----|------|-----|-----|-----|--------|
| 1 | **爬虫抓取失败** | /news 页无新内容 | 源 API 挂 · 或返回结构变 | 查 GitHub Actions 日志 | 加 try/catch · 单源挂不影响其他 | ✅ Promise.allSettled |
| 2 | **AI 主通道欠费** | 编辑器 AI 兜底报 402 | DeepSeek 账户没钱 | 看 ai_call_logs 表 · error_code 字段 | 充值 · 或依赖备用通道 | ✅ 4 通道 fallback |
| 3 | **AI 输出非 JSON** | JSON.parse 失败 | LLM 偶尔 ```json 包裹 | 抓 raw response 看 | 加 regex 剥壳 + try/catch 兜底 | ✅ 已在 gemini.ts 做 |
| 4 | **AI 超时** | 编辑器转圈超过 60s | Vercel Hobby 函数 60s 超时 | 看 Vercel 日志 | 已加 maxDuration=60 · 未来加 stream | ⚠️ 目前只能重试 |
| 5 | **详情页崩溃(Server Component render error)** | 用户看红字报错 | Server → Client 传函数 / revalidatePath 触发 RSC 崩 | 看 digest · 查 Vercel Runtime Logs | 改为传 JSX 数组 / 移除 revalidatePath 换 unstable_cache tag | ✅ 已解决 |
| 6 | **登录后无法退出** | 点退出无反应 | router.refresh() 在某些环境挂 | 复现 · F12 看错 | 改 window.location.href = '/' 强刷 | ✅ 已解决 |
| 7 | **图片上传失败** | 编辑器粘贴图片报错 | Vercel Blob token 未配置 / 权限缺 | 查 /api/upload 返回 | 检查 BLOB_READ_WRITE_TOKEN | ⚠️ 需手动配 |
| 8 | **内容重复(Cron 抓)** | 同一条 news 出现多次 | onConflictDoNothing 失效 · 或 external_id 变 | SQL 查 group by 计数 | 加 unique index | ✅ 已在 schema |
| 9 | **详情页缓存不刷新** | 改标题后前台不更新 | unstable_cache tag 没清 · 或 Cloudflare CDN 缓存 | curl -I 看 cf-cache-status | revalidateTag + 手动 purge Cloudflare | ✅ 已解决 |
| 10 | **中国用户访问慢/挂** | 部分省份秒开 · 部分挂 | GFW 对某些 IP 段限速 | ITDog 全国测速 | 用 Cloudflare 前置 · 或备案上 EdgeOne | ✅ 已 Cloudflare |

## 6.2 日常运维清单

| 频次 | 检查项 | 怎么做 |
|-----|-------|------|
| **每天(2 分钟)** | Vercel Deployments 有无失败 | 打开 dashboard 扫一眼 · 或订阅邮件通知 |
| **每天(2 分钟)** | 昨日 AI 调用成功率 | Supabase SQL `SELECT ... FROM ai_call_logs WHERE created_at > yesterday` |
| **每周(5 分钟)** | 内容质量抽查 | /admin/picks 点 3 条草稿 · 看 6 维填得对不对 |
| **每周(5 分钟)** | 邮件送达率 | Resend dashboard 查上周 · 送达率 > 95% 就 OK |
| **每月(15 分钟)** | 月度归档验证 | 1 号 GitHub Actions 触发后 · 查 analytics_monthly_snapshots · 看有没有本月记录 |
| **每季度(30 分钟)** | 依赖升级 · 安全扫描 | `npm audit fix` · Dependabot alerts 处理 |

## 6.3 【3 句速记】

1. **"最容易挂的是 AI 通道 · 靠 4 通道 fallback + admin 审核兜住"**
2. **"最难排查的是 RSC 渲染错误 · 靠 digest + Vercel Runtime Logs 定位"**
3. **"日常运维每天 5 分钟:看 Vercel + 看 AI 成功率 + 每周抽查内容"**

---

# 📅 模块 7 · 项目迭代与关键决策复盘

## 7.1 从 0 到 1 里程碑

### 阶段 1 · 静态 MVP(v1.0 · 2026 年上半年前)
- **做了什么:** GitHub Pages + 纯 HTML/CSS · 手写内容 · 无后端 · 无用户系统
- **核心目标:** 验证内容定位是否成立 · 有多少人愿意读
- **关键决定:** 从 "纯博客" 定位 → **"AI 情报站 · 信息滤镜"**

### 阶段 2 · 全栈迁移(2026 年 6 月 · Batch 9-15)
- **做了什么:** 迁到 Next.js 15 · Supabase · 引入 4 大内容模块结构
- **核心目标:** 支撑动态内容 · 支持用户交互
- **决定:** 上 Next.js 而不是 Nuxt(招聘广度)

### 阶段 3 · 用户系统 + 互动(Batch 16 · 2026 年 6 月末)
- **做了什么:** Better Auth + GitHub OAuth · likes/saves/comments 三张表
- **核心目标:** 建立最小可行的用户闭环

### 阶段 4 · 内容自动化(Batch 17 · 2026 年 7 月初)
- **做了什么:** GitHub Actions 每 30 分钟抓 · SEO/GEO · 全站搜索
- **决定:** GitHub Actions 而不是 Vercel Cron(Vercel Hobby 只能日频)

### 阶段 5 · Admin 编辑体系(Batch 18-22 · 2026 年 7 月中)
- **做了什么:** 5 个后台编辑器 · AI 兜底 · 图片粘贴 · 批量操作
- **核心目标:** 让创作者(我)0 障碍产出内容

### 阶段 6 · 上线宣发(Batch 20 · 2026 年 7 月 13-15 日)
- **做了什么:** 买 ¥8 域名 · Cloudflare CDN · 迁 EdgeOne 失败回滚 · 分析面板 · 埋点体系
- **核心目标:** 中国 92% 秒开 · 小红书宣发准备就绪

## 7.2 关键决策复盘(5 个)【面试高频】

### 决策 1 · 为什么做 4 大内容模块?
- **背景:** 单纯堆资讯站太多了 · 卷不过公众号/推特
- **可选方案:** ① 只做资讯聚合 ② 只做深度长文 ③ 4 层分工
- **选:** 4 层分工
- **理由:** 4 层解决 4 个深度需求 · 用户来的目的不同 · 内容形态匹配

### 决策 2 · 为什么做邮件订阅而不只做站内?
- **背景:** 独立站流量靠**主动召回** · 不能只靠 SEO/自然流
- **可选方案:** ① 只做站内推荐 ② 微信公众号 ③ 邮箱周报
- **选:** 邮箱周报(未来加公众号)
- **理由:** 邮箱**跨平台 · 不依赖某个 App** · 且 Resend 3000 封/月免费

### 决策 3 · 为什么采用 "AI 生成 + 人工审核" 混合模式?
- **背景:** 纯 AI 生成 6 维会瞎编 · 纯手工 20 min/条太慢
- **可选方案:** ① 纯 AI ② 纯手工 ③ AI 生成默认草稿 + 人工审
- **选:** ③
- **理由:** AI 提效 · 人保底线 · 用户看到的都是审核过的

### 决策 4 · 为什么选 Next.js + Supabase 而不是别的技术栈?
- **背景:** 1 人开发 · 时间紧 · 要免费上线
- **可选方案:** ① Django + Postgres 自建 ② Rails ③ Next.js + Supabase
- **选:** ③
- **理由:** Next.js **前后端一起写** · Supabase **免费云 DB + 认证** · Vercel **一键部署** · 全栈一人扛得住

### 决策 5 · 为什么不上 EdgeOne 而回到 Vercel?
- **背景:** 想让中国用户秒开 · 试过 EdgeOne 国际版
- **可选方案:** ① EdgeOne 国际版 ② Vercel + Cloudflare ③ 备案 + EdgeOne 中国站
- **选:** ② Vercel + Cloudflare · 花 ¥8 买域名
- **理由:** EdgeOne 国际版默认排除中国大陆 · 撑不住;备案 20-40 天太慢;Vercel + Cloudflare 1 小时上线 · 中国 92% 秒开

## 7.3 踩坑与经验沉淀(5 个)

### 坑 1 · EdgeOne 国际版默认排除中国大陆
- **发现:** 部署完 · 从国内访问显示 "401 · MLC excluded"
- **影响:** 迁移工作 2 天白费
- **解决:** 回滚到 Vercel · 走 Cloudflare 前置
- **沉淀:** **免费产品条款要读完** · 尤其是"国际版 vs 中国站"

### 坑 2 · Server → Client Components 不能传函数
- **发现:** /me 页崩溃 · digest 3655385328
- **影响:** 用户后台 100% 打不开
- **解决:** 把 renderItem 函数改成预渲染 JSX 数组
- **沉淀:** **React Server Components 的边界**要牢记

### 坑 3 · AI 输出被 markdown 代码块包裹
- **发现:** JSON.parse 报错 · 但看 raw response 明明是 JSON
- **影响:** AI 兜底功能间歇性挂
- **解决:** 加 regex 剥壳 · 加 response_format=json_object
- **沉淀:** **LLM 输出永远 defensive coding**

### 坑 4 · 详情页缓存 4 层不同步
- **发现:** 改标题后 · 列表页更新 · 详情页还是旧的
- **影响:** 编辑体验混乱
- **解决:** revalidateTag('articles') + revalidatePath(具体 slug) + 未来加 CF purge
- **沉淀:** **多层缓存要理清 · Next.js unstable_cache tag 必须清**

### 坑 5 · Vercel Analytics 免费版数据 30 天消失
- **发现:** 想做月度复盘时 · 昨天的 UV 数据都查不到 raw
- **影响:** 面试要讲月度趋势时无据可查
- **解决:** 自建 analytics_monthly_snapshots 表 · GitHub Actions 每月归档
- **沉淀:** **数据的所有权 > 便利** · 关键数据必须自己存

## 7.4 【3 句速记】

1. **"6 个阶段 · 从静态 MVP 到全栈 · 用了 30 天"**
2. **"5 个关键决策:4 层内容 · 邮箱订阅 · AI+人审 · Next.js+Supabase · Cloudflare 前置"**
3. **"5 个大坑都记住了:EdgeOne 排 MLC · RSC 传函数 · LLM 输出防御 · 缓存 4 层 · Vercel 30 天消失"**

---

# 🎯 全手册速查目录

- **模块 1 · 产品全景**:定位/用户/差异化/4 模块分工/用户旅程
- **模块 2 · 技术栈**:5 层技术 + 架构 + Vibe Coding 边界
- **模块 3 · 数据流转**:抓取 → 结构化 → AI 处理 → 展示
- **模块 4 · 埋点体系**:3 层埋点 · WAP 北极星 · 4 类二级
- **模块 5 · AI 细节**:4 通道选型 + Prompt 4 原则 + 边界
- **模块 6 · 异常兜底**:10 场景 · 5 运维项
- **模块 7 · 迭代复盘**:6 阶段 · 5 决策 · 5 踩坑

---

# 📌 待补事项(诚实标注)

| 项 | 补充方式 |
|---|--------|
| 内容质量量化评估集 | 建 20-50 条 golden case · 手工写完美 6 维 |
| content_view/scroll_end 客户端埋点 | 未来 Batch 24 · 加 client-side scroll tracker |
| signup_success 埋点 | 需 Hook Better Auth 回调 · 未来实现 |
| 邮件 UTM tracking | Resend 邮件模板加 utm_source=weekly · CTR 分析 |
| 内容 A/B 实验框架 | 目前无 · 待 100 UV+ 后再上 |

---

**手册完** · 版本 v1 · 2026-07-15

**任何模块想细化 / 加数字 / 换角度 · 告诉我扩写。**
