/**
 * 时间线自动补充 · 从最近新闻中检测各家族的新版本号,
 * 经 AI 生成一句话摘要后写入 timeline_versions(id 前缀 auto-)。
 *
 * 设计原则(保守):
 * - 只识别明确的"发布/上线"信号词,避免把"回顾/对比"里的旧版本误入刻
 * - 已存在的版本(模糊匹配)跳过
 * - 每次运行最多补 3 条,AI 失败时退化为新闻标题摘要
 * - 编辑可在 /admin/timeline 审阅、修改或删除 auto- 条目
 */
import { db, newsItems, timelineVersions } from '@/db';
import { desc, gte, eq } from 'drizzle-orm';
import { generateWithAI } from '@/lib/ai/gemini';

type Family = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'domestic';

// 各家族的版本号检测模式(按优先级,一条新闻命中多个家族时都记)
const DETECTORS: {
  family: Family;
  pattern: RegExp;
  normalize: (m: RegExpMatchArray) => string;
  label: (m: RegExpMatchArray) => string;
}[] = [
  {
    family: 'anthropic',
    pattern: /claude[-\s]?(opus|sonnet|haiku)[-\s]?(\d+(?:\.\d+)?)/i,
    normalize: (m) => `claude-${m[1].toLowerCase()}-${m[2]}`,
    label: (m) => `Claude ${cap(m[1])} ${m[2]}`,
  },
  {
    family: 'openai',
    pattern: /gpt[-\s]?(\d+(?:\.\d+)?)[-\s]?(pro|mini|nano)?\b/i,
    normalize: (m) => `gpt-${m[1]}${m[2] ? `-${m[2].toLowerCase()}` : ''}`,
    label: (m) => `GPT-${m[1]}${m[2] ? ` ${m[2]}` : ''}`,
  },
  {
    family: 'google',
    pattern: /gemini[-\s]?(\d+(?:\.\d+)?)[-\s]?(pro|flash|ultra)?\b/i,
    normalize: (m) => `gemini-${m[1]}${m[2] ? `-${m[2].toLowerCase()}` : ''}`,
    label: (m) => `Gemini ${m[1]} ${m[2] || ''}`.trim(),
  },
  {
    family: 'deepseek',
    pattern: /deepseek[- ]?(?:v|reasoner|r)?(\d+(?:\.\d+)?)/i,
    normalize: (m) => `deepseek-${m[1]}`,
    label: (m) => `DeepSeek ${m[1]}`,
  },
  {
    family: 'domestic',
    pattern: /(qwen|kimi|doubao|豆包)[- ]?(v?r?\d+(?:\.\d+)?|k\d(?:\.\d)?)/i,
    normalize: (m) => `${m[1].toLowerCase()}-${m[2].toLowerCase()}`,
    label: (m) => `${cap(m[1])} ${m[2]}`,
  },
];

// 必须带发布信号词,降低"回顾旧版本"的误报
const RELEASE_HINT = /(发布|上线|推出|开源|释出|更新|launch|release|announce|roll out|ships?\b)/i;

const RELEASE_WORDS = /(发布|上线|推出|开源|正式)/;

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// DeepSeek 家族历史版本 · 事实数据,随 cron 幂等播种(onConflictDoNothing)
// Cursor 家族已下线:每次运行顺带清理其旧条目
const SEED_VERSIONS: (typeof timelineVersions.$inferInsert)[] = [
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

async function seedFamilies() {
  // 清理已下线的 Cursor 家族
  await db.delete(timelineVersions).where(eq(timelineVersions.family, 'cursor'));
  // 幂等写入种子版本
  let seeded = 0;
  for (const v of SEED_VERSIONS) {
    const r = await db.insert(timelineVersions).values(v).onConflictDoNothing({ target: timelineVersions.id }).returning({ id: timelineVersions.id });
    seeded += r.length;
  }
  return seeded;
}

export async function autoUpdateTimeline(): Promise<{ inserted: number; candidates: number; seeded: number; skipped: boolean }> {
  const seeded = await seedFamilies();
  const since = new Date(Date.now() - 10 * 24 * 3600 * 1000);

  const [recentNews, existing] = await Promise.all([
    db
      .select({
        id: newsItems.id,
        title: newsItems.title,
        summary: newsItems.summary,
        publishedAt: newsItems.publishedAt,
      })
      .from(newsItems)
      .where(gte(newsItems.publishedAt, since))
      .orderBy(desc(newsItems.publishedAt))
      .limit(300),
    db.select({ version: timelineVersions.version }).from(timelineVersions),
  ]);

  const existingVersions = existing.map((r) => r.version.toLowerCase());

  // 每个候选:归一化 key → 最佳(最新、分数最高)新闻
  const candidates = new Map<string, {
    family: Family;
    versionLabel: string;
    news: { id: string; title: string; summary: string | null; publishedAt: Date };
  }>();

  for (const n of recentNews) {
    const text = `${n.title} ${n.summary || ''}`;
    if (!RELEASE_HINT.test(n.title) || !RELEASE_WORDS.test(text)) continue;

    for (const d of DETECTORS) {
      const m = n.title.match(d.pattern) || (n.summary || '').match(d.pattern);
      if (!m) continue;
      const key = `${d.family}:${d.normalize(m)}`;
      // 已有相近版本 → 跳过
      if (existingVersions.some((v) => v.includes(d.normalize(m)))) continue;
      if (!candidates.has(key)) {
        candidates.set(key, {
          family: d.family,
          versionLabel: d.label(m),
          news: { id: n.id, title: n.title, summary: n.summary, publishedAt: n.publishedAt },
        });
      }
    }
  }

  // 每次最多入库 3 条,避免噪声批量涌入
  const toInsert = [...candidates.values()].slice(0, 3);
  let inserted = 0;

  for (const c of toInsert) {
    const d = new Date(c.news.publishedAt);
    const dateLabel = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;

    let title = c.news.title.slice(0, 120);
    let changes = [((c.news.summary || c.news.title).replace(/\s+/g, ' ').trim()).slice(0, 90)];
    let signal: string | null = null;

    // AI 生成摘要(失败则用新闻原文,不阻塞入库)
    try {
      const raw = await generateWithAI(
        `你是独立媒体"AI Lens"的编辑,正在维护 AI 模型版本时间线。根据下面这条新闻,为版本 "${c.versionLabel}" 生成时间线条目。

新闻标题:${c.news.title}
新闻摘要:${c.news.summary || '(无)'}

输出严格 JSON,不要 markdown 包裹:
{
  "title": "这个版本的一句话定位(20字以内,说清它是什么、强在哪)",
  "changes": ["关键变化1(30字内)", "关键变化2(30字内)", "关键变化3(30字内)"],
  "signal": "PM 视角的行业信号(40字内,没有可靠依据就写 null)"
}

只依据新闻内容,不要编造跑分和定价。signal 字段没有把握时输出 null。`,
        { temperature: 0.4, maxTokens: 800, useCase: 'timeline_auto' },
      );
      const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
      if (typeof parsed.title === 'string' && parsed.title) title = parsed.title;
      if (Array.isArray(parsed.changes) && parsed.changes.length > 0) {
        changes = parsed.changes.slice(0, 3).map((x: unknown) => String(x).slice(0, 90));
      }
      if (typeof parsed.signal === 'string' && parsed.signal) signal = parsed.signal.slice(0, 120);
    } catch {
      // AI 不可用 → 保留新闻原文摘要
    }

    await db
      .insert(timelineVersions)
      .values({
        id: `auto-${c.family}-${c.versionLabel.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`,
        family: c.family,
        version: c.versionLabel,
        title,
        dateLabel,
        dateOrder: d,
        breakthrough: false,
        changes,
        capability: null,
        signal,
      })
      .onConflictDoNothing({ target: timelineVersions.id });
    inserted++;
  }

  return { inserted, candidates: candidates.size, seeded, skipped: toInsert.length === 0 };
}
