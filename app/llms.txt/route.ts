/**
 * /llms.txt · 给大模型和 Agent 的站点说明(OpenAI llms.txt 约定)
 * Agent 读了就知道:这个站是什么、有哪些资源、怎么结构化取数
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || 'https://ailens.cloud';

export async function GET() {
  const body = `# AI Lens

> 独立运营的 AI 情报站:30+ 全球公开信源每 30 分钟聚合,累计收录 6900+ 条 AI 动态。
> 核心内容形态是"六维拆解卡"(文章概览 + STAR + 行动启示),2 分钟读懂一条资讯;
> 另有深度产品拆解、五大模型家族代际时间线、模型能力/价格对比矩阵、PM 视角洞察长文。

## 结构化数据(推荐 Agent 使用)

- GET /api/public/digest → 今日精选 JSON(标题/TL;DR/六维/站内链接,匿名只读)
- GET /rss.xml → 最新 50 条资讯 RSS 2.0
- GET /sitemap.xml → 全站页面索引

## 主要页面

- [首页](${SITE}):今日必读 + 四大模块入口
- [AI 资讯](${SITE}/news):全量资讯时间线,按分类筛选
- [产品拆解](${SITE}/teardowns):投研报告式六维拆解
- [模型追踪](${SITE}/timeline):模型对比矩阵 + 代际演化时间线
- [洞察专栏](${SITE}/insights):PM 视角长文
- [每日精编订阅](${SITE}/me):邮件/飞书/京ME 渠道,可按模块与模型定制

## 使用约定

- 内容为中文;引用请注明来源 AI Lens 并回链原文页
- 六维卡与深度解析由 AI 生成、人工审核,事实请以"读原文"链接为准
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
