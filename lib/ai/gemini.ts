/**
 * 统一 AI 生成接口
 * 优先级:DEEPSEEK_API_KEY > ZHIPU_API_KEY > GROQ_API_KEY > GEMINI_API_KEY
 *
 * DeepSeek: 国产 · 中文出色 · 稳定 · 便宜 · 需充值(¥10 起 · 够用几年)
 * Zhipu GLM-4-Flash: 国产 · 完全免费 · 无限次 · 中文尚可 · 中国区首选
 * Groq: 14,400 req/day 免费 · 速度极快 · 但注册页对中国 IP blocked
 * Gemini: 1500 req/day 免费 · Free tier 常 503 / 429
 */

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const ZHIPU_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_ENDPOINT = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

async function callDeepSeek(prompt: string, opts: { temperature: number; maxTokens: number }): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY 未配置');

  const res = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('DeepSeek 返回为空');
  return text;
}

async function callZhipu(prompt: string, opts: { temperature: number; maxTokens: number }): Promise<string> {
  const key = process.env.ZHIPU_API_KEY;
  if (!key) throw new Error('ZHIPU_API_KEY 未配置');

  const res = await fetch(ZHIPU_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: ZHIPU_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zhipu ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Zhipu 返回为空');
  return text;
}

async function callGroq(prompt: string, opts: { temperature: number; maxTokens: number }): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY 未配置');

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Groq 返回为空');
  return text;
}

async function callGemini(prompt: string, opts: { temperature: number; maxTokens: number }): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY 未配置');

  const res = await fetch(`${GEMINI_ENDPOINT(GEMINI_MODEL)}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature,
        maxOutputTokens: opts.maxTokens,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 503) throw new Error('Gemini 高负载(建议同时配 DEEPSEEK_API_KEY 自动 fallback)');
    if (res.status === 429) throw new Error('Gemini 配额限制,请稍等再试');
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Gemini 返回为空');
  return text;
}

/**
 * 主入口:按优先级依次尝试三家 AI 服务
 */
export async function generateWithAI(prompt: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const params = { temperature: opts?.temperature ?? 0.7, maxTokens: opts?.maxTokens ?? 2048 };
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  const hasZhipu = !!process.env.ZHIPU_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  if (!hasDeepSeek && !hasZhipu && !hasGroq && !hasGemini) {
    throw new Error('未配置 AI 服务 · 请在 Vercel env 设置 DEEPSEEK_API_KEY / ZHIPU_API_KEY / GROQ_API_KEY / GEMINI_API_KEY 中的至少一个');
  }

  const errors: string[] = [];

  if (hasDeepSeek) {
    try { return await callDeepSeek(prompt, params); }
    catch (e: any) { errors.push('DeepSeek: ' + e.message); }
  }

  if (hasZhipu) {
    try { return await callZhipu(prompt, params); }
    catch (e: any) { errors.push('Zhipu: ' + e.message); }
  }

  if (hasGroq) {
    try { return await callGroq(prompt, params); }
    catch (e: any) { errors.push('Groq: ' + e.message); }
  }

  if (hasGemini) {
    try { return await callGemini(prompt, params); }
    catch (e: any) { errors.push('Gemini: ' + e.message); }
  }

  throw new Error('所有 AI 服务都失败 · ' + errors.join(' · '));
}

// 兼容旧代码
export const generateWithGemini = generateWithAI;

/**
 * 给每日精选自动生成 6 维分析 + 编辑观点
 */
export async function generatePickAnalysis(pick: {
  name: string;
  url: string;
  tagline: string;
  category: string;
}): Promise<{
  positioning: string;
  painPoint: string;
  solution: string;
  designHighlight: string;
  vibeCoding: string;
  commercial: string;
  consensus: string;
  criticism: string;
  editorTake: string;
}> {
  const prompt = `你是资深 AI 产品经理,为独立媒体"AI Lens"写产品拆解。请对下面这个产品做 6 维分析。

产品:${pick.name}
一句话:${pick.tagline}
分类:${pick.category}
官网:${pick.url}

请输出严格的 JSON,不要 markdown 代码块包裹。字段如下,每个字段 40-100 字中文,有具体判断不空话:

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

只输出 JSON。`;

  const raw = await generateWithAI(prompt, { temperature: 0.6, maxTokens: 4096 });
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('AI 返回不是有效 JSON:' + raw.slice(0, 200));
  }
}
