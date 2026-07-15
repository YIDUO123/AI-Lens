# AI Lens · 埋点解读报告 v1

> **报告时间:** 2026-07-15
> **数据窗口:** 首次埋点上线至今(约 4 分钟窗口)
> **样本量:** AI 调用日志 N=4 · 通用事件 N=0
> **数据源:** ai_call_logs 表(生产 Supabase Postgres)

---

## 🔍 数据完整性检查(spec 校验)

| 检查项 | 结果 |
|-------|------|
| ai_call_logs 字段齐全度 | ✅ 100%(4/4 条含全部预期字段) |
| 有无重复 id | ✅ 无重复 |
| 时间序列 | ✅ 正常递增(2026-07-15 04:34:01 → 04:38:20 UTC) |
| success/attempts_count 语义一致 | ✅(attempts_count=1 都是 fallback 链首个;=2 是切到 zhipu) |
| error_code 只在 success=false 时出现 | ✅ |
| user_events 数据 | ⚠️ 表存在 · 有 0 条 · 说明订阅/搜索埋点未被触发 |

---

## 📌 摘要 · 3 条可写进简历的量化结论(**注意小样本 · 见末尾"诚实边界"**)

### 结论 1 · 4 通道 AI Fallback 架构 · 生产环境 100% 兜住失败请求

- **口径:** 在 N=4 次生产 AI 调用中 · 主通道 DeepSeek 因账户欠费 100% 返回 402 · 每次都被 fallback 到第 2 通道 Zhipu 成功兜住 · 最终业务侧成功率 100%
- **样本量:** ai_call_logs N=4 · 覆盖 2 个独立请求场景(每个场景先 deepseek 失败 · 后 zhipu 成功 · 一次业务调用产生 2 条日志)
- **原始数据:** deepseek success_rate=0/2=0% · zhipu success_rate=2/2=100% · attempts_count 分布 `{1: 2 fail, 2: 2 success}`

### 结论 2 · Zhipu 兜底通道稳定性 · P95 延迟 21.9s · 输出长度平均 728 字

- **口径:** N=2 次 Zhipu(GLM-4-Flash)成功调用中 · P50 延迟 21648ms · P95 延迟 21990ms · 平均输出 728 字符
- **样本量:** N=2 次成功调用
- **原始数据:** duration_ms 分别为 21268ms 和 22028ms · output_length 分别为 723 和 733 字符

### 结论 3 · Fallback 触发延迟 · 主通道快速失败给兜底争取时间

- **口径:** N=2 次 DeepSeek 失败调用中 · 均在 1 秒内返回 402(平均 789ms · 分别 679ms 和 898ms)· 保证了整体请求时间可控
- **样本量:** N=2 次快速失败
- **意义:** 说明 fallback 设计不会拖长用户等待时间(兜底通道总用时 = 主通道快速失败 + 备通道正常执行 · 约 22-23s)

---

## 🎬 STAR 素材草稿

### **S · Situation(处境)**

> "在开发 AI Lens 独立内容站过程中 · 我需要给编辑器接入 AI 兜底生成能力(比如自动填 6 维产品分析)。但独立开发者面临一个核心问题:**任何单一 AI 服务都不能承诺 100% 可用** · DeepSeek 可能余额不足 · Gemini 可能地区限流 · Zhipu 可能网络异常 · 而这类失败一旦发生 · 用户手动 fallback 到别的通道非常笨拙。"

**依赖的 event/指标:**
- `ai_call_logs.provider="deepseek", success=false, error_code=402 Insufficient Balance`(真实观测到主通道失败)

### **T · Task(任务)**

> "设计一个 **对上层业务代码完全透明** 的多通道 AI Fallback 架构 · 让开发者用一个函数 `generateWithAI(prompt)` 就能自动享受多 provider 冗余 · 同时:
> 1. 每次调用的**成功率、耗时、fallback 生效链**都要留痕
> 2. **失败不能拖垮主流程** · 埋点必须 fire-and-forget
> 3. 上线后能出**面试可讲的量化数据**"

**依赖的 event/指标:**
- `analytics_spec.md` 里明确的 5 个简历指标
- `ai_call_logs` 表的字段设计(use_case/provider/success/attempts_count/duration_ms)

### **A · Action(行动)**

> "1. **架构层**:在 `lib/ai/gemini.ts` 里 · 按 `DeepSeek → Zhipu → Groq → Gemini` 优先级链式调用 · 每个通道用统一的 `tryProvider(provider, fn, attemptsCount)` 包装 · 内含计时器 + fire-and-forget 埋点。
> 2. **数据层**:设计 `ai_call_logs` 表(id/use_case/provider/success/attempts_count/duration_ms/input_length/output_length/error_code/created_at)· PostgreSQL + Drizzle ORM · 独立于业务 DB 表 · 便于长期归档。
> 3. **归档层**:因 Vercel Analytics 免费版数据 30 天消失 · 我另配 GitHub Actions 每月 1 号触发 `/api/cron/analytics-snapshot` · 把上月 raw 日志聚合入 `analytics_monthly_snapshots`(永久)。
> 4. **规范层**:写 `analytics_spec.md` · 每个事件明确 目标/定义/一行 JSON 示例 · 附 5 个可 SQL 直接查的简历指标 · 附完整本地验证步骤。
> 5. **隐私层**:PII 字段(email/token/ip)在 `cleanupProps` 里正则剔除 · 搜索关键词只上报 hash · 单条 props 上限 2KB。"

**依赖的 event/指标:**
- 4 通道 fallback 链(见 `lib/ai/gemini.ts` 里的 `tryProvider`)
- ai_call_logs 表设计(见 `db/schema/analytics.ts`)
- 月度归档 cron(见 `app/api/cron/analytics-snapshot/route.ts`)

### **R · Result(结果)**

> "生产环境**首个 4 分钟内**观测到主通道 DeepSeek 因账户欠费出现 100% 失败 · 但**业务侧 AI 生成成功率仍为 100%** · 全部被 Zhipu 兜底(Zhipu P95 延迟 21990ms · 输出平均 728 字符)。这个数字**用真实的日志表可反查每一条**(生产环境 N=4 · attempts_count 分布 `{1: 2 fail, 2: 2 success}`)。
>
> 更重要的是 —— 这套埋点架构本身也是产品的一部分:上线一天内能追溯所有 AI 调用 · 每月自动归档避免数据消失 · 未来任何时候都能拉出 **AI 调用成功率 · P95 延迟 · fallback 命中率** 这几个核心 SLA 指标(见 `analytics_spec.md` 里的 5 个 SQL 查询)。"

**依赖的 event/指标:**
- 生产环境真实数据 · SQL 可直接验证
- ai_call_logs 表 4 条真实记录
- analytics_spec.md 的 5 个 SQL 查询模板

---

## 🚨 风险与诚实边界(**必读 · 简历怎么写不虚夸**)

### ❌ 不能这样写(会被面试官戳穿)

- ~~"AI 调用成功率 99.X% · 覆盖 XX 万次调用"~~ · **样本才 4 次 · 数字是虚构的**
- ~~"每月节省 XX 小时"~~ · **没有对照组 · 没有编辑器无 AI 版本的数据**
- ~~"Newsletter 转化率 X%"~~ · **user_events 表现在是空的 · 没数据**

### ✅ 可以这样写(诚实 · 但有力)

**建议表述 1(基于机制 · 不夸样本):**
> "为 AI Lens 独立内容站设计并实现 4 通道 AI Fallback 架构(DeepSeek → Zhipu → Groq → Gemini)· 生产验证:主通道 DeepSeek 因欠费返回 402 时 · 备用 Zhipu 100% 兜住(N=4 · 生产真实数据)· fallback 单次延迟增量 ~1 秒 · 用户无感。"

**建议表述 2(基于设计 · 讲专业度):**
> "自研埋点体系覆盖 AI 通道调用、订阅漏斗、搜索命中三类事件 · 每次记录 use_case + provider + duration + fallback 链 · 独立 3 张表 + 月度归档 cron 解决 Vercel Analytics 免费版 30 天数据消失问题;附完整 SQL 查询手册。"

**建议表述 3(讲工程质量):**
> "埋点采用 fire-and-forget 模式 · DB 写入失败不阻塞主流程 · props 单条 2KB 上限自动截断 · PII 字段(email/token/ip)在 cleanupProps 里正则剔除 · spec 文档含完整本地验证步骤。"

### 📅 未来 30 天可加强 R 段的行动(样本量升 10 倍)

1. **触发订阅埋点** · 你或朋友在 https://ailens.cloud 首页填测试邮箱订阅一次 → 观测 `newsletter_subscribe` 事件
2. **触发搜索埋点** · 打开 https://ailens.cloud/search?q=agent → 观测 `search_submit` 事件
3. **充值 DeepSeek ¥10** · 让主通道恢复 · 再产生一批**成功率 100%(主通道一次中)**的对照数据
4. **多写几篇长文 · 用 AI 润色/摘要 20+ 次** · 让 use_case 从"只有 pick_analysis"扩展到 polish_insight/excerpt_generate/polish_teardown

**这些做完后 · N 从 4 涨到 40+ · 上面所有 STAR 数字变**真正可信的量化**。**

---

## 📎 附:如何自己复算这些数字

打开 Supabase SQL Editor(或 `npx tsx scripts/analytics-report.ts`)· 跑:

```sql
-- 结论 1 · fallback 兜底效果
SELECT
  attempts_count,
  COUNT(*) FILTER (WHERE success)::int AS success,
  COUNT(*) FILTER (WHERE NOT success)::int AS fail
FROM ai_call_logs
GROUP BY attempts_count
ORDER BY attempts_count;

-- 结论 2 · Zhipu 稳定性
SELECT
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::int AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::int AS p95_ms,
  ROUND(AVG(output_length))::int AS avg_output_chars
FROM ai_call_logs
WHERE provider='zhipu' AND success;

-- 结论 3 · 主通道快速失败
SELECT
  ROUND(AVG(duration_ms))::int AS avg_fail_ms
FROM ai_call_logs
WHERE provider='deepseek' AND NOT success;
```

---

## 📮 面试官可能追问 & 你的答案

**Q: 你说 N=4 · 数据太少 · 为什么不等更多数据再写简历?**
> A: "样本量的确小 · 所以简历用的是**机制描述 + 观测到的具体行为**(如'主通道 402 时备用通道 100% 兜住 N=4')· 而不是虚构的百分比。等 Q3 生产运行 30 天后 · 数字会自然涨到 40+ · 到时候用**成功率 %** 替换现在的**具体次数**表述。"

**Q: fallback 会不会造成用户等待翻倍?**
> A: "不会 · 主通道设计成快速失败(观测 P50 789ms)· 备用通道正常执行(P95 21990ms)· 用户端总延迟主要由备用通道决定 · fallback 增量约 1 秒 · 相比 22 秒的核心时间不到 5% 影响。"

**Q: 为什么每月归档?为什么不用 Vercel Analytics 就够?**
> A: "Vercel Analytics 免费版 30 天数据自动消失 · 且没有查询 API · 简历上写的量化数字若在面试时被问'能给我拉最近 6 个月的走势吗' · 我拿不出来。所以我自建 `analytics_monthly_snapshots` 表 · 每月 1 号 GitHub Actions 触发聚合 · **永久保留可查**。"

---

## 🔁 未来 v2 报告(等数据积累后)

- 加入 newsletter_subscribe 漏斗分析
- 加入 search_submit 关键词聚类
- 加入 by-time 走势图(7 日/30 日曲线)
- 加入内容 Top 排行 vs AI 生成频次的相关性

**当前 v1 报告基于 N=4 生产真实数据 · 主要用于验证埋点管道通了 + 提供 STAR 骨架 · 请配合"诚实边界"章节使用。**
