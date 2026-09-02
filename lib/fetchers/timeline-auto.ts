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
import { desc, gte } from 'drizzle-orm';
import { generateWithAI } from '@/lib/ai/gemini';

type Family = 'openai' | 'anthropic' | 'google' | 'cursor' | 'domestic';

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
    family: 'cursor',
    pattern: /cursor[-\s]?(\d+(?:\.\d+)?)/i,
    normalize: (m) => `cursor-${m[1]}`,
    label: (m) => `Cursor ${m[1]}`,
  },
  {
    family: 'domestic',
    pattern: /(deepseek|qwen|kimi|doubao|豆包)[- ]?(v?r?\d+(?:\.\d+)?|k\d(?:\.\d)?)/i,
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

export async function autoUpdateTimeline(): Promise<{ inserted: number; candidates: number; skipped: boolean }> {
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

  return { inserted, candidates: candidates.size, skipped: toInsert.length === 0 };
}
