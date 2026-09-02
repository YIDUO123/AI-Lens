/**
 * 一次性种子脚本 · Cursor 家族 → DeepSeek 家族
 * 1. 删除 timeline_versions 里 family='cursor' 的旧条目
 * 2. 写入 DeepSeek 家族的历史版本(V2 → V3.2-Exp,均为已发布事实)
 * 3. 之后的更新由 /api/cron/models 的自动检测补充(新版本号从新闻识别)
 *
 * 运行:npm run db:seed-deepseek   (需要 .env.local 有 DATABASE_URL)
 */
import 'dotenv/config';
import { db, timelineVersions } from '@/db';
import { eq } from 'drizzle-orm';

const DEEPSEEK_VERSIONS = [
  {
    id: 'deepseek-v2',
    family: 'deepseek',
    version: 'DeepSeek V2',
    title: '开源 MoE + MLA,把推理成本打到一个数量级以下',
    dateLabel: '2024.05',
    dateOrder: new Date('2024-05-01'),
    breakthrough: false,
    changes: ['首发 MLA 注意力架构,显存占用大幅下降', 'API 定价仅为同级模型的 1/100,开启价格战'],
    capability: '通用对话与编码达到开源第一梯队',
    signal: '中国团队第一次以"价格屠夫"身份进入全球视野。',
  },
  {
    id: 'deepseek-v3',
    family: 'deepseek',
    version: 'DeepSeek V3',
    title: '671B MoE 开源旗舰,训练效率震惊业界',
    dateLabel: '2024.12',
    dateOrder: new Date('2024-12-26'),
    breakthrough: true,
    changes: ['671B MoE,激活 37B,推理成本极低', '训练成本约 $5.6M,挑战"大模型=天价训练"的认知', '编码/数学基准直逼 GPT-4o 与 Claude 3.5 Sonnet'],
    capability: '开源权重里首次全面对标头部闭源模型',
    signal: '证明了顶级模型可以被"低成本+工程化"造出来。',
  },
  {
    id: 'deepseek-r1',
    family: 'deepseek',
    version: 'DeepSeek R1',
    title: '纯 RL 训出的推理模型,开源界的 Sputnik 时刻',
    dateLabel: '2025.01',
    dateOrder: new Date('2025-01-20'),
    breakthrough: true,
    changes: ['纯强化学习激发长链推理,无需监督微调', '数学/代码达到 OpenAI o1 同级', 'MIT 协议开源 + 蒸馏小模型全系列放出'],
    capability: '复杂推理(数学/代码/逻辑)开源 SOTA',
    signal: '美股 AI 叙事首次被开源权重模型动摇,推理范式从闭源溢出到全球。',
  },
  {
    id: 'deepseek-v3-1',
    family: 'deepseek',
    version: 'DeepSeek V3.1',
    title: '混合推理:一个模型兼顾"快答"与"深思"',
    dateLabel: '2025.08',
    dateOrder: new Date('2025-08-19'),
    breakthrough: false,
    changes: ['Think/Non-Think 混合模式,按需切换推理深度', 'Agent 工具调用与搜索能力显著增强', '上下文扩展至 128K'],
    capability: '通用任务 + 深度推理一体化',
    signal: '混合推理成为开源阵营的标配设计。',
  },
  {
    id: 'deepseek-v3-2-exp',
    family: 'deepseek',
    version: 'DeepSeek V3.2-Exp',
    title: 'DSA 稀疏注意力,API 价格再砍一半以上',
    dateLabel: '2025.09',
    dateOrder: new Date('2025-09-29'),
    breakthrough: true,
    changes: ['引入 DSA(DeepSeek Sparse Attention)稀疏注意力实验架构', '长上下文场景 API 输出价直降 50%+', '开源实验权重供社区复现'],
    capability: '长文档/长会话场景的成本最优解',
    signal: '注意力效率成为下一轮价格战的主战场。',
  },
];

async function main() {
  // 1. 移除旧的 Cursor 家族条目
  const deleted = await db.delete(timelineVersions).where(eq(timelineVersions.family, 'cursor')).returning({ id: timelineVersions.id });

  // 2. 写入 DeepSeek 历史版本(已存在则跳过)
  let inserted = 0;
  for (const v of DEEPSEEK_VERSIONS) {
    const r = await db.insert(timelineVersions).values(v).onConflictDoNothing({ target: timelineVersions.id }).returning({ id: timelineVersions.id });
    inserted += r.length;
  }

  console.log(`[seed-deepseek] 删除 cursor 条目 ${deleted.length} 个 · 新增 deepseek 条目 ${inserted} 个`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed-deepseek] 失败:', e);
  process.exit(1);
});
