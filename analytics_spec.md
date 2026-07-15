# AI Lens · 埋点规范(Analytics Spec)

> **一句话:** 每个 admin/PM/AI 生成事件都留痕 · **DB 是权威源** · Vercel Analytics 是可视化补充 · 每月归档到 `analytics_monthly_snapshots` 表 · **永久保留可查**。
>
> 用途:面试写 STAR 简历、复盘产品增长、优化 AI 兜底、找内容缺口。

---

## 🎯 三层写入通道(埋点永不阻塞主流程)

```
                        ┌─→ 1. DB(权威源 · 永久)· lib/analytics/log.ts
[某个事件发生]  ─→ logEvent()/logAiCall()
                        ├─→ 2. analytics_events.log 本地文件(**dev 才写** · 生产 serverless 静默失败)
                        └─→ 3. console.log(**dev/ANALYTICS_DEBUG=1 才输出** · 生产在 Vercel Runtime Logs)
```

**并发/失败:** 全部 fire-and-forget · try/catch 吞异常 · `logEvent` **返回 void 不返回 Promise** · 调用方不 await · 不影响业务代码链路。

**本地日志文件说明:**
- 路径:项目根 `analytics_events.log`(每行一个 JSON · ndjson 格式)
- 目录不存在自动创建(通过 `fs.appendFile` 的行为)
- 并发写:Node.js 的 `fs.appendFile` 在 POSIX 系统上对**小写入**是原子的 · ndjson 每行独立 · 多请求并发不会撕行
- 生产环境:Vercel 的 serverless 函数**文件系统只读** · `appendFile` 静默失败 · 主流程无感;所有数据仍进 DB
- 隐私:所有 PII 字段(email/password/token/secret/ip)在 `cleanupProps` 里被剔除

---

## 📊 目前已埋的事件(v1 · Phase 1)

### 🔥 AI 调用日志(`ai_call_logs` 表 · 每次通道调用一条)

| 触发时机 | 目标(业务/性能问题) | 定义(触发条件 + 字段) |
|---|---|---|
| **每次 `generateWithAI()` 内部调用某个 AI 通道后** | **AI 兜底 4 通道靠不靠谱?各通道的成功率/延迟?哪个 useCase 用得最多?** | 触发条件:通道 fetch 返回后 · 无论成功失败 · 都记录一条<br>字段:`use_case`(pick_analysis/polish_insight/polish_teardown/excerpt_generate/...)`, `provider`(deepseek/zhipu/groq/gemini)`, `success`, `attempts_count`(是第几个 fallback), `duration_ms`, `input_length`, `output_length`, `error_code`, `created_at` |

**示例 · 一行 JSON:**
```json
{"ts":"2026-07-14T13:22:11.302Z","event":"ai_call","id":"AbCdEf...","use_case":"pick_analysis","provider":"zhipu","success":true,"attempts_count":2,"duration_ms":18450,"input_length":812,"output_length":2143,"error_code":null}
```

---

### 🔥 通用用户事件(`user_events` 表 · 客户端 & 服务端共用)

| event_name | 触发时机 | 目标 · 定义 · 关键字段 |
|-----|-----|-----|
| `newsletter_subscribe` | 首次订阅成功(`/api/newsletter/subscribe` 服务端 & 客户端表单双写)| **每月 Newsletter 订阅漏斗转化率是多少?哪个入口贡献最大?**<br>字段:`source`(home / footer / insight...) `is_new`(是不是首次)`compact`(是否窄版组件) |
| `newsletter_resubscribe` | 用户曾经退订又再次订阅 | **多少人退订后又回来?** · 字段:`source` |
| `newsletter_subscribe_fail` | 客户端订阅提交失败 | **表单出错的常见原因?** · 字段:`source`, `err_head`(错误前 40 字) |
| `search_submit` | `/search` 页服务端渲染时 · query 非空即触发 | **用户在搜什么?搜索命中率多少?**<br>字段:`query_hash`(hash 8-12 字 · 不明文)`query_length`(整数)`result_count`(0 = 未命中)`is_empty`(bool) |

**示例 · 一行 JSON:**
```json
{"ts":"2026-07-14T14:03:55.148Z","event":"newsletter_subscribe","id":"XyZ...","props":{"source":"home","is_new":true},"user_id":null,"session_id":"a8b2c9d","path":"/api/newsletter/subscribe"}
```

---

### 🔥 月度归档(`analytics_monthly_snapshots` 表 · 每月 1 号 GitHub Actions 触发)

| 字段 | 内容 |
|---|---|
| `month` | "2026-07" |
| `ai_summary` | 上月 AI 调用统计:total / success / success_rate / P50 P95 延迟 / by_provider · by_use_case 分组明细 · first_try_hit_rate(4 通道 fallback 用几次) |
| `event_summary` | 上月各事件计数 + unique_users + unique_sessions |
| `content_summary` | 当前 Top 20 articles / teardowns 按 view 排 · 最近 20 条 picks |
| `meta` | 覆盖天数 · raw 行数 · 归档时间 |

**Vercel Analytics 数据(PV/UV/国家/引荐来源)由于免费版无 API · 无法程序归档:**
- 建议每月 1 号手工去 Vercel 后台 Analytics 页**截图存 `snapshots/YYYY-MM.png`**
- 提交到 Git 里 · 永久保留

---

## 🏆 5 个简历可写指标(基于以上数据聚合)

### 1. AI 兜底调用成功率 & P95 延迟
```sql
SELECT
  COUNT(*) FILTER (WHERE success) * 1.0 / COUNT(*) AS success_rate,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE success) AS p95_ms,
  COUNT(*) FILTER (WHERE success AND attempts_count=1) * 1.0 / COUNT(*) FILTER (WHERE success) AS first_try_hit_rate
FROM ai_call_logs
WHERE created_at > NOW() - INTERVAL '30 days';
```

### 2. Newsletter 订阅转化率
```sql
WITH monthly AS (
  SELECT
    COUNT(*) FILTER (WHERE event_name='newsletter_subscribe' AND (props->>'is_new')::bool) AS subs,
    COUNT(DISTINCT session_id) AS uv
  FROM user_events
  WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT subs, uv, ROUND(subs::numeric / NULLIF(uv, 0), 4) AS conversion_rate FROM monthly;
```

### 3. 搜索命中率 & 用户需求 Top 关键词
```sql
SELECT
  COUNT(*) FILTER (WHERE (props->>'is_empty')::bool = false) * 1.0 / COUNT(*) AS hit_rate,
  COUNT(DISTINCT props->>'query_hash') AS unique_queries
FROM user_events
WHERE event_name = 'search_submit'
  AND created_at > NOW() - INTERVAL '30 days';
```

### 4. AI 参与内容生产比例
```sql
SELECT use_case, COUNT(*) FROM ai_call_logs
WHERE created_at > NOW() - INTERVAL '30 days' AND success
GROUP BY use_case ORDER BY COUNT(*) DESC;
```

### 5. Fallback 通道有效性(说明 4 通道设计的价值)
```sql
SELECT provider, attempts_count, COUNT(*) FROM ai_call_logs
WHERE success AND created_at > NOW() - INTERVAL '30 days'
GROUP BY provider, attempts_count ORDER BY provider, attempts_count;
```

---

## 🔒 隐私 & 敏感数据处理

**默认不上报:**
- `email` / `password` / `token` / `secret` / `api_key` / `ip`(在 `cleanupProps` 里正则剔除)
- 搜索 query 明文(只上报 `query_hash` + `query_length`)
- URL 全串(采集器场景下 · 只上报 domain + hash)

**上报但脱敏:**
- `user_id`:已是 nanoid(10) · 不可逆
- `session_id`:客户端 localStorage 生成的匿名 id · 不含 IP/UA

**Props 上限:** 单条 2KB(超出截断)· 字段名 ≤ 40 字符 · 字符串值 ≤ 500 字符

---

## ⚙️ 假设(implementation notes)

1. **文件系统在 Vercel serverless 是只读** → `analytics_events.log` 只在本地 dev 有内容 · 生产静默失败
2. **Vercel Analytics 免费版没有读取 API** → 我们不能程序化归档它的数据 · 需要手工截图 monthly
3. **Better Auth 目前没接 signup_success 埋点** → 未来加(需要 Hook 到 auth.callback 后)· 现在只能靠客户端在登录成功后手动 `track()`,或用 DB 里 user.createdAt 反推日活
4. **Client 端 track 走 sendBeacon**:即使页面 unload 也能发出去 · fetch 有 `keepalive: true` 兜底

---

## 🧪 如何本地验证(重要)

### 前置
```bash
cd /Users/lizhouyang.750/Claude/ai-lens-2.0
# 只跑一次 · 建 3 张分析表(幂等)
npx tsx scripts/migrate-analytics.ts

# 开发模式起 dev server
npm run dev
```

### 步骤 1 · 验证 AI 调用日志(重头戏)

1. 打开 `http://localhost:3000/admin/picks/[某条]` 进入某个精选详情
2. 点 **AI 兜底填 6 维**(或者 `/admin/insights/[id]` 的 ✨ AI 润色/摘要)
3. 观察 4 处 · **每处都能看到相同一条**:

   - **Terminal 里**:`[analytics] ai_call { use_case: 'pick_analysis', provider: 'zhipu', success: true, ... }`
   - **项目根**:`tail -f analytics_events.log` 有新行追加
   - **DB**:直接进 Supabase SQL Editor 跑
     ```sql
     SELECT * FROM ai_call_logs ORDER BY created_at DESC LIMIT 5;
     ```
   - **Vercel Analytics 后台**:如果在生产 · 会看到 `ai_call` 事件计数(dev 环境不上报到 Vercel)

### 步骤 2 · 验证订阅埋点

1. 打开首页 `http://localhost:3000/`(或任意有 newsletter 表单的页)
2. 填一个测试邮箱 · 点订阅
3. 观察:
   - **Terminal**:`[analytics] newsletter_subscribe { source: 'home', is_new: true }`
   - **文件**:`grep newsletter analytics_events.log`
   - **DB**:
     ```sql
     SELECT * FROM user_events WHERE event_name='newsletter_subscribe' ORDER BY created_at DESC LIMIT 3;
     ```

### 步骤 3 · 验证搜索埋点

1. 打开 `http://localhost:3000/search?q=agent`(或其他关键词)
2. 观察:
   - `[analytics] search_submit { query_hash: 'abc123', query_length: 5, result_count: 12, is_empty: false }`
   - 文件里有 `search_submit` 行
   - DB `user_events` 表里有一条 event_name=search_submit 记录

### 步骤 4 · 手动跑一次月度归档(不用等到下月 1 号)

```bash
# 归档 2026-07 · 手动传 month 参数(不传默认归档上月)
# 本地测试(dev server 需在跑)
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/analytics-snapshot?month=2026-07"

# 或生产环境测
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://ailens.cloud/api/cron/analytics-snapshot?month=2026-07"
```

返回结构:
```json
{
  "ok": true,
  "month": "2026-07",
  "ai_call_logs_rows": 42,
  "user_events_rows": 118,
  "ai_summary": {
    "total": 42, "success": 41, "success_rate": 0.9762,
    "first_try_hit_rate": 0.88,
    "p50_ms": 12000, "p95_ms": 25000,
    "by_provider": {
      "zhipu": { "total": 40, "success": 39, "success_rate": 0.975, "p50_ms": 11000, "p95_ms": 23000 }
    }
  }
}
```

然后查 DB 快照表:
```sql
SELECT month, ai_summary, event_summary, meta FROM analytics_monthly_snapshots ORDER BY month DESC;
```

---

## 🚀 生产环境部署

无需额外配置 · 现有的 3 项 secrets 已够用:
- `DATABASE_URL` · `CRON_SECRET` · `PROD_URL`

**GitHub Actions 月度触发已配置:** `.github/workflows/monthly-snapshot.yml` · 每月 1 号 UTC 03:17 (北京 11:17)自动跑。

**如果想立刻验证生产:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://ailens.cloud/api/cron/analytics-snapshot?month=2026-07
```

---

## 📌 未来可扩展(v2 · 需要时再加)

- `content_view` 客户端 track(细分 slug + reading_time)
- `content_scroll_50` / `content_scroll_end` 滚动深度
- `image_upload_success/fail`(观察图片编辑器体验)
- `editor_open/save/publish`(观察编辑效率)
- `url_collect_success/fail`(观察 URL 采集器成功率)

**加新事件的模板:**
```typescript
// 客户端(自动含 session_id + path)
import { track } from '@/lib/analytics/track-client';
track('event_name_here', { some_prop: 'value' });

// 服务端
import { logEvent } from '@/lib/analytics/log';
logEvent('event_name_here', { some_prop: 'value' }, { userId, path: '/some/route' });
```
