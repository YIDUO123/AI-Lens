# AI Lens · 2.0

> 尝试看清 AI 产品的实质 · 独立 AI 情报站的 Next.js 全栈重构

## 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **后端**: Next.js API Routes(即将)
- **数据库**: Supabase PostgreSQL + Drizzle ORM(即将)
- **认证**: better-auth(即将)
- **部署**: Vercel(即将)

## 本地运行

```bash
# 1. 装依赖(首次或 package.json 变化后)
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器
open http://localhost:3000
```

## 项目结构

```
ai-lens-2.0/
├── app/                     · Next.js App Router
│   ├── layout.tsx           · 根布局(nav + footer)
│   ├── page.tsx             · 首页
│   ├── globals.css          · 全局样式 + 品牌色 tokens
│   └── (todo) news/         · AI 资讯页
│   └── (todo) teardowns/    · 产品拆解页
│   └── (todo) timeline/     · 迭代追踪页
│   └── (todo) insights/     · 洞察专栏
│   └── (todo) about/        · 关于
│   └── (todo) admin/        · 管理后台
│   └── (todo) api/          · API Routes
├── components/
│   ├── ui/                  · shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── nav.tsx              · 顶部导航
│   └── footer.tsx           · 页脚
├── lib/
│   └── utils.ts             · cn (className merge)
└── public/                  · 静态资源
```

## 开发进度

- [x] Batch 8 · 骨架搭建(Next.js + Tailwind + shadcn/ui + 首页)
- [ ] Batch 9 · 数据库(Supabase + Drizzle schema)
- [ ] Batch 10 · 认证(better-auth · GitHub OAuth)
- [ ] Batch 11-13 · 页面迁移(资讯 / 拆解 / 时间轴 / 洞察 / 关于)
- [ ] Batch 14 · 自动化(Vercel Cron 替代 GitHub Actions)
- [ ] Batch 15-16 · 用户功能(收藏 / 评论 / 订阅)
- [ ] Batch 17 · Admin 后台
- [ ] Batch 18 · Vercel 部署

## 设计系统

品牌色(HSL,便于 shadcn 集成):

```css
--ink: 0 0% 10%          /* #1A1A1A 黑 */
--coral: 16 100% 60%     /* #FF6B35 珊瑚色主 accent */
--gold: 43 100% 65%      /* #FFB84D 金 */
--teal: 178 74% 20%      /* #0E5C5A 青绿 */
--cream: 40 100% 98%     /* #FFFDF7 卡片底 */
```

字体:
- 中文 + 正文:-apple-system + PingFang SC
- 品牌 accent(em / big number):Georgia serif italic

## 与 v1 的关系

v1(../portfolio)是静态 HTML/CSS/JS 版本,仍在维护、可独立部署。
v2 迁移完成前,v1 继续作为生产环境。
