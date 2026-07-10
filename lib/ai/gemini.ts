/**
 * Google Gemini Flash · 免费额度 15 RPM · 1500 请求/天 · 1M tokens/天
 * https://aistudio.google.com/app/apikey 获取 API key,存到 Vercel env var GEMINI_API_KEY
 */

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function generateWithGemini(prompt: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('未配置 GEMINI_API_KEY(去 aistudio.google.com/app/apikey 免费获取)');

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts?.temperature ?? 0.7,
        maxOutputTokens: opts?.maxTokens ?? 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API 失败: ${res.status} · ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Gemini 返回为空');
  return text;
}

/**
 * 给每日精选自动生成 6 维分析 + 编辑观点
 * 返回结构化 JSON,由 caller 保存到 daily_picks 表
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
  const prompt = `你是一位资深 AI 产品经理,正在为独立媒体"AI Lens"写产品拆解。请对下面这个产品做 6 维分析。

产品:${pick.name}
一句话:${pick.tagline}
分类:${pick.category}
官网:${pick.url}

请输出严格的 JSON(不要 markdown 代码块包裹),字段如下,每个字段 40-100 字,中文,有具体判断不空话:

{
  "positioning": "定位 · 一句话讲清这个产品在赛道里的位置",
  "painPoint": "痛点 · 它解决了什么真实需求, 用户之前是怎么处理的",
  "solution": "产品解法 · 它用什么核心机制解这个痛点",
  "designHighlight": "设计亮点 · 交互 / UX 上的巧思, 别人没做到的地方",
  "vibeCoding": "Vibe Coding 灵感 · 独立开发者/PM 如何用 AI Native 工具(Cursor + Claude + MCP 等) 快速复现类似产品的 MVP",
  "commercial": "商业价值分析 · 定价模式 · 目标用户 · 天花板判断",
  "consensus": "用户共识 · 大部分用户认为它好在哪(基于常识和产品定位推断)",
  "criticism": "用户质疑 · 大部分用户吐槽它哪里(基于常识和产品定位推断)",
  "editorTake": "AI Lens 编辑观点 · 从 PM 视角,这个产品值得学什么, 或它揭示了什么行业信号(70-120 字)"
}

只输出 JSON,不要任何前缀后缀。`;

  const raw = await generateWithGemini(prompt, { temperature: 0.6 });
  try {
    // Gemini 有时会用 markdown 代码块包裹, 去掉
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Gemini 返回不是有效 JSON:' + raw.slice(0, 200));
  }
}
