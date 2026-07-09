/**
 * 从 OpenRouter API 拉取模型列表 → upsert 到 models 表
 * 每 6 小时由 Vercel Cron 调用
 */
import { db, models } from '@/db';
import { sql } from 'drizzle-orm';

const OR_MODELS = 'https://openrouter.ai/api/v1/models';

type Tier = 'flagship' | 'pro' | 'mid' | 'small' | 'creative' | 'legacy';
type Group = 'chat' | 'codex';

const TARGET_MODELS: Record<string, { family: string; tier: Tier; group: Group }> = {
  // OpenAI
  'openai/gpt-5':               { family: 'openai',    tier: 'flagship', group: 'chat' },
  'openai/gpt-5-mini':          { family: 'openai',    tier: 'mid',      group: 'chat' },
  'openai/gpt-5-pro':           { family: 'openai',    tier: 'pro',      group: 'chat' },
  'openai/gpt-5.5':             { family: 'openai',    tier: 'flagship', group: 'chat' },
  'openai/gpt-5.5-pro':         { family: 'openai',    tier: 'pro',      group: 'chat' },
  'openai/gpt-4o':              { family: 'openai',    tier: 'legacy',   group: 'chat' },
  'openai/gpt-4.1':             { family: 'openai',    tier: 'legacy',   group: 'chat' },
  // Codex
  'openai/gpt-5-codex':         { family: 'openai',    tier: 'flagship', group: 'codex' },
  'openai/gpt-5.1-codex':       { family: 'openai',    tier: 'mid',      group: 'codex' },
  'openai/gpt-5.1-codex-max':   { family: 'openai',    tier: 'pro',      group: 'codex' },
  'openai/gpt-5.2-codex':       { family: 'openai',    tier: 'flagship', group: 'codex' },
  'openai/gpt-5.3-codex':       { family: 'openai',    tier: 'flagship', group: 'codex' },
  // Anthropic
  'anthropic/claude-opus-4.5':  { family: 'anthropic', tier: 'flagship', group: 'chat' },
  'anthropic/claude-opus-4.8':  { family: 'anthropic', tier: 'flagship', group: 'chat' },
  'anthropic/claude-sonnet-4.5':{ family: 'anthropic', tier: 'mid',      group: 'chat' },
  'anthropic/claude-sonnet-4.6':{ family: 'anthropic', tier: 'mid',      group: 'chat' },
  'anthropic/claude-sonnet-5':  { family: 'anthropic', tier: 'mid',      group: 'chat' },
  'anthropic/claude-haiku-4.5': { family: 'anthropic', tier: 'small',    group: 'chat' },
  'anthropic/claude-fable-5':   { family: 'anthropic', tier: 'creative', group: 'chat' },
  // Google
  'google/gemini-2.5-pro':      { family: 'google',    tier: 'flagship', group: 'chat' },
  'google/gemini-2.5-flash':    { family: 'google',    tier: 'mid',      group: 'chat' },
  'google/gemini-3.5-flash':    { family: 'google',    tier: 'flagship', group: 'chat' },
  'google/gemini-3.1-flash':    { family: 'google',    tier: 'mid',      group: 'chat' },
};

// 编辑手写的能力评级(未来可搬到 admin UI 里维护)
const MODEL_META: Record<string, any> = {
  // OpenAI
  'openai/gpt-5':               { positioning: '综合能力旗舰',       released: '2026.03', reasoning: 5,   coding: 4,   speed: '中',   multimodal: '文本·图像·音频',       highlight: '推理与工具调用最稳,分层价格覆盖全场景', limits: '视频理解仍弱,极长上下文时延偏高' },
  'openai/gpt-5-mini':          { positioning: '性价比首选',         released: '2026.03', reasoning: 4,   coding: 3.5, speed: '快',   multimodal: '文本·图像',           highlight: '综合价格甜蜜点,大部分场景 90% 效果 · 30% 成本', limits: '复杂推理不如 flagship' },
  'openai/gpt-5-pro':           { positioning: '深度推理专用',       released: '2026.03', reasoning: 5,   coding: 4.5, speed: '慢',   multimodal: '文本·图像·音频',       highlight: '专为高价值任务,输出价 $120/M 定价', limits: '成本高,不适合大流量场景' },
  'openai/gpt-5.5':             { positioning: '2026 中期新旗舰',    released: '2026.06', reasoning: 5,   coding: 4.5, speed: '中',   multimodal: '文本·图像·音频',       highlight: '在 5.0 基础上做长上下文和 agent 优化', limits: '起步阶段,生态兼容仍需时间' },
  'openai/gpt-5.5-pro':         { positioning: 'GPT-5.5 深度推理版', released: '2026.06', reasoning: 5,   coding: 5,   speed: '慢',   multimodal: '文本·图像·音频',       highlight: '专业推理场景当前的准 SOTA', limits: '价格昂贵,普通场景性价比低' },
  'openai/gpt-4o':              { positioning: '多模态经典',         released: '2024.05', reasoning: 3.5, coding: 3.5, speed: '快',   multimodal: '文本·图像·音频',       highlight: '成本可控,首个统一多模态模型', limits: '推理已落后于 5.x 系列' },
  'openai/gpt-4.1':             { positioning: '长上下文遗产',       released: '2025.04', reasoning: 3.5, coding: 3.5, speed: '中',   multimodal: '文本·图像',           highlight: '1M 上下文的早期方案,仍是稳定选择', limits: '推理表现已被 5.x 全面超越' },
  // OpenAI Codex
  'openai/gpt-5-codex':         { positioning: 'AI 编码专项旗舰',    released: '2026.04', reasoning: 4,   coding: 5,   speed: '中',   multimodal: '文本',                 highlight: '400K 上下文,长任务重构默认选择', limits: '仅适合编码,通用推理弱于 chat 系列' },
  'openai/gpt-5.1-codex':       { positioning: 'Codex 中端版',       released: '2026.05', reasoning: 4,   coding: 5,   speed: '快',   multimodal: '文本',                 highlight: '性价比编码,输入 $1.25/M · 输出 $10/M', limits: '不适合极其复杂的架构级重构' },
  'openai/gpt-5.1-codex-max':   { positioning: 'Codex 顶配',         released: '2026.05', reasoning: 4.5, coding: 5,   speed: '慢',   multimodal: '文本',                 highlight: '一次任务完成大规模重构,高价保命', limits: '成本高,需精挑场景' },
  'openai/gpt-5.2-codex':       { positioning: 'Codex 2 代旗舰',     released: '2026.06', reasoning: 4.5, coding: 5,   speed: '中',   multimodal: '文本',                 highlight: 'Agent-style 长任务能力大幅提升', limits: '生态兼容中' },
  'openai/gpt-5.3-codex':       { positioning: 'Codex 最新旗舰',     released: '2026.07', reasoning: 4.5, coding: 5,   speed: '中',   multimodal: '文本',                 highlight: '当前 AI 编码 SOTA', limits: '新版本,部分工具链适配中' },
  // Anthropic
  'anthropic/claude-opus-4.5':  { positioning: '专业向标杆',         released: '2025.11', reasoning: 5,   coding: 4.5, speed: '中',   multimodal: '文本·图像',           highlight: '推理与写作最像专家,MCP 生态完整', limits: '价格偏高,起步年代较早' },
  'anthropic/claude-opus-4.8':  { positioning: 'Opus 系列最新',      released: '2026.05', reasoning: 5,   coding: 5,   speed: '中',   multimodal: '文本·图像',           highlight: '1M 上下文,Computer Use 生产可用', limits: '成本仍高,大流量场景需谨慎' },
  'anthropic/claude-sonnet-4.5':{ positioning: '综合最强性价比',     released: '2025.10', reasoning: 4.5, coding: 4.5, speed: '快',   multimodal: '文本·图像',           highlight: '1M 上下文,编码 SOTA,$3/$15 定价', limits: '极复杂推理仍不如 Opus' },
  'anthropic/claude-sonnet-4.6':{ positioning: 'Sonnet 迭代版',      released: '2026.01', reasoning: 4.5, coding: 4.5, speed: '快',   multimodal: '文本·图像',           highlight: '在 4.5 基础上强化 tool use', limits: '定位与 4.5 接近,新旧共存' },
  'anthropic/claude-sonnet-5':  { positioning: 'Sonnet 下一代',      released: '2026.06', reasoning: 5,   coding: 5,   speed: '快',   multimodal: '文本·图像',           highlight: '性价比达到新高度,推理接近 Opus', limits: '刚发布,长期表现待观察' },
  'anthropic/claude-haiku-4.5': { positioning: '轻量快响应',         released: '2025.10', reasoning: 3.5, coding: 3,   speed: '极快', multimodal: '文本·图像',           highlight: '毫秒级响应,高频调用场景首选', limits: '深度推理弱' },
  'anthropic/claude-fable-5':   { positioning: '创作型旗舰',         released: '2026.06', reasoning: 4.5, coding: 4,   speed: '中',   multimodal: '文本·图像',           highlight: '文风与语气细腻度最强,写作首选', limits: '事实性任务并非它的舒适区' },
  // Google
  'google/gemini-2.5-pro':      { positioning: '长上下文旗舰',       released: '2025.03', reasoning: 4.5, coding: 4,   speed: '中',   multimodal: '文本·图像·视频·音频',   highlight: '1M+ 上下文,Google 全家桶集成', limits: '推理有时不稳定,agent 弱于 Claude' },
  'google/gemini-2.5-flash':    { positioning: '边际成本最优',       released: '2025.03', reasoning: 3.5, coding: 3.5, speed: '极快', multimodal: '文本·图像·音频',       highlight: '输入 $0.3/M,大规模嵌入场景首选', limits: '推理与编码不适合复杂任务' },
  'google/gemini-3.5-flash':    { positioning: 'Flash 新一代',       released: '2026.05', reasoning: 4,   coding: 4,   speed: '极快', multimodal: '全模态',              highlight: '价格进一步下探,能力向 2.5 Pro 靠近', limits: '新版本,生态兼容中' },
  'google/gemini-3.1-flash':    { positioning: '过渡代中端',         released: '2026.04', reasoning: 3.5, coding: 3.5, speed: '极快', multimodal: '全模态',              highlight: '2.5 Flash 的直接升级,兼容平滑', limits: '与 3.5 Flash 定位重叠' },
};

export async function fetchAndStoreModels() {
  const res = await fetch(OR_MODELS, { cache: 'no-store' });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const { data } = (await res.json()) as { data: any[] };
  const lookup = new Map(data.map((m) => [m.id, m]));

  const tierOrder: Record<Tier, number> = { flagship: 0, pro: 1, mid: 2, small: 3, creative: 4, legacy: 5 };
  const rows: any[] = [];

  for (const [id, meta] of Object.entries(TARGET_MODELS)) {
    const m = lookup.get(id);
    if (!m) continue;
    const p = m.pricing || {};
    const priceIn = parseFloat(p.prompt || 0) * 1_000_000;
    const priceOut = parseFloat(p.completion || 0) * 1_000_000;
    const ctx = m.context_length || m.top_provider?.context_length || 0;
    rows.push({
      id,
      name: m.name || id.split('/').pop(),
      family: meta.family,
      tier: meta.tier,
      modelGroup: meta.group,
      contextLength: Math.floor(ctx),
      pricingIn: Math.round(priceIn * 1000) / 1000,
      pricingOut: Math.round(priceOut * 1000) / 1000,
      description: (m.description || '').slice(0, 400),
      meta: MODEL_META[id] || null,
      fetchedAt: new Date(),
    });
  }

  rows.sort((a, b) => {
    if (a.family !== b.family) return a.family.localeCompare(b.family);
    return tierOrder[a.tier as Tier] - tierOrder[b.tier as Tier];
  });

  if (rows.length === 0) return { total: 0 };

  await db.insert(models).values(rows).onConflictDoUpdate({
    target: models.id,
    set: {
      name: sql`excluded.name`,
      contextLength: sql`excluded.context_length`,
      pricingIn: sql`excluded.pricing_in`,
      pricingOut: sql`excluded.pricing_out`,
      description: sql`excluded.description`,
      meta: sql`excluded.meta`,
      fetchedAt: sql`excluded.fetched_at`,
    },
  });

  return { total: rows.length };
}
