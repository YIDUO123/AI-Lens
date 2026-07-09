# 🗄️ Supabase 数据库设置指南

> 完全免费 · 不需要信用卡 · 5-10 分钟搞定

## 阶段 1 · 注册 Supabase(2 分钟)

1. 打开 [supabase.com](https://supabase.com) → 右上角 **Start your project**
2. 选择 **Continue with GitHub**(用你的 GitHub 账号一键登录)
3. 授权后自动进入 Dashboard

---

## 阶段 2 · 创建数据库项目(3 分钟)

1. Dashboard 首页点 **New project**
2. 填表:
   - **Name**: `ai-lens`(或你喜欢的)
   - **Database Password**: 点旁边的 **Generate a password** 生成一个 → **务必复制存到密码管理器**,一会儿要用
   - **Region**: 选 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)** —— 国内访问最快
   - **Pricing Plan**: 保持 **Free** 不动
3. 点 **Create new project**

⏳ 等 1-2 分钟,数据库创建完成(页面会显示 "Setting up project...")

---

## 阶段 3 · 拿到 DATABASE_URL(1 分钟)

项目就绪后:

1. 左侧栏 **Project Settings**(齿轮图标)→ **Database**
2. 划到 **Connection string** 段落
3. 选 tab **URI**
4. **勾选下方的 "Use connection pooling"**(**很重要!** Serverless 需要)
5. 复制那个 URI(格式:`postgresql://postgres.xxxxx:[YOUR-PASSWORD]@...`)
6. 把 `[YOUR-PASSWORD]` 替换成你刚才存的数据库密码

---

## 阶段 4 · 本地配置(2 分钟)

在你的 `ai-lens-2.0/` 项目目录:

```bash
# 1. 复制环境变量模板
cp .env.local.example .env.local

# 2. 用编辑器打开 .env.local,把 DATABASE_URL 那行改成你复制的连接串
# (VS Code / Sublime / vim 都行)
```

**其他环境变量**(GitHub OAuth 等)Batch 10 再配,现在只需要 `DATABASE_URL`。

---

## 阶段 5 · 推送 schema 到数据库(1 分钟)

在 `ai-lens-2.0/` 目录下:

```bash
# 首次装依赖(如果还没装)
npm install

# 把 Drizzle schema 生成并推送到 Supabase
npm run db:push
```

**成功的话你会看到**:
```
✓ Reading Drizzle schema...
✓ Pulling schema from database...
+ [+] Created table: user
+ [+] Created table: session
+ [+] Created table: account
+ [+] Created table: verification
+ [+] Created table: articles
+ [+] Created table: teardowns
+ [+] Created table: timeline_versions
+ [+] Created table: daily_picks
+ [+] Created table: news_items
+ [+] Created table: models
+ [+] Created table: releases
+ [+] Created table: saves
+ [+] Created table: likes
+ [+] Created table: comments
+ [+] Created table: subscriptions
```

**15 张表**一次性建好。

---

## 阶段 6 · 可视化查看(可选,推荐)

```bash
# 打开 Drizzle Studio(一个精美的数据库管理页面)
npm run db:studio
```

浏览器会打开 [https://local.drizzle.studio](https://local.drizzle.studio),可以看到你所有的表、字段、数据。

或者直接在 **Supabase Dashboard → Table Editor** 里看,也很清楚。

---

## 🎉 完成后你有什么

- **免费 Postgres 数据库**(500 MB · 5 万月活 · 5 GB 带宽)
- **15 张业务表**全部建好,零 SQL 你写的
- **Drizzle Studio** 可以像 Notion 一样看数据
- **未来任何 schema 改动**都是 `edit ts file → npm run db:push` 一键完成

---

## 常见问题

### Q: 连接失败,报 "SASL: SCRAM-SERVER-FINAL-MESSAGE" 或类似的?
- 检查 `.env.local` 里的 password 是不是替换正确了(不能有 `[]` 括号)
- 检查是不是选了 "Use connection pooling"

### Q: `Region` 选哪个国内最快?
- 北京/上海用户:Tokyo
- 广州/深圳/香港用户:Singapore
- 海外用户:选就近区域

### Q: 数据库暂停了怎么办?(7 天不用会自动暂停)
- Supabase Dashboard → 项目 → **Restore** 一键唤醒,几秒钟
- 或者直接在你的网站上访问一次,自动唤醒

### Q: 我不小心把 `.env.local` commit 了?
- 立即在 Supabase Dashboard 重置数据库密码
- 从 git 历史中删除该文件

---

## 🚀 下一步

数据库就绪后,告诉我 **"数据库好了"**,Batch 10 开始配置 better-auth 登录系统。
