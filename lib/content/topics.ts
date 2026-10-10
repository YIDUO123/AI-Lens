/**
 * 主题聚合 · 跨分类的关键词专题(零迁移,纯查询层)
 * 新增主题:往 TOPICS 加一条即可
 */
export type Topic = {
  slug: string;
  icon: string;
  title: string;
  desc: string;
  keywords: string[];
};

export const TOPICS: Topic[] = [
  {
    slug: 'agents', icon: '🤖', title: 'Agent 专场',
    desc: '智能体、Computer Use、多 Agent 协作——当下最卷的赛道,一条不漏。',
    keywords: ['agent', 'agents', '智能体', 'computer use', 'browser use', 'agentic'],
  },
  {
    slug: 'open-source', icon: '📖', title: '开源动态',
    desc: '开源模型、开源权重、开源工具——生态占位与社区驱动的每一次落子。',
    keywords: ['开源', 'open source', 'open weights', '权重', 'mit 协议', 'apache'],
  },
  {
    slug: 'funding', icon: '💰', title: '融资与资本',
    desc: '融资、估值、并购——投资人对赛道的判断,都藏在钱里。',
    keywords: ['融资', 'funding', '估值', 'raised', 'series a', 'series b', 'acqui', '并购', 'ipo'],
  },
  {
    slug: 'pricing', icon: '🏷️', title: '价格与成本',
    desc: 'API 定价、价格战、边际成本——模型选型的另一半是账。',
    keywords: ['定价', '价格', 'pricing', '成本', '$/1m', 'per million', '降价', '免费'],
  },
  {
    slug: 'vibe-coding', icon: '⌨️', title: 'Vibe Coding',
    desc: 'Cursor、Codex、Claude Code——AI 编码工具与独立开发者的工作流。',
    keywords: ['cursor', 'codex', 'claude code', 'vibe coding', '编码', 'ide', 'copilot'],
  },
  {
    slug: 'context', icon: '📏', title: '上下文与长文本',
    desc: '上下文长度、长文档理解、记忆机制——大模型的第二战场。',
    keywords: ['上下文', 'context window', '1m', '长文本', '长上下文', 'token'],
  },
];

export function getTopic(slug: string): Topic | null {
  return TOPICS.find((t) => t.slug === slug) || null;
}
