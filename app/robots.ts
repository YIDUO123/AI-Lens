import type { MetadataRoute } from 'next';

const SITE = process.env.BETTER_AUTH_URL || 'https://ai-lens-six.vercel.app';

/**
 * robots.txt
 * 明确允许 AI 搜索引擎爬取 · 是 GEO 优化的核心
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 通用爬虫
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/me', '/sign-in', '/sign-up'] },

      // 明确欢迎 AI 搜索
      { userAgent: 'GPTBot', allow: '/', disallow: ['/admin', '/api/', '/me'] },              // ChatGPT
      { userAgent: 'ChatGPT-User', allow: '/', disallow: ['/admin', '/api/', '/me'] },        // ChatGPT plugin
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: ['/admin', '/api/', '/me'] },       // OpenAI Search
      { userAgent: 'Claude-Web', allow: '/', disallow: ['/admin', '/api/', '/me'] },          // Claude
      { userAgent: 'ClaudeBot', allow: '/', disallow: ['/admin', '/api/', '/me'] },           // Claude
      { userAgent: 'anthropic-ai', allow: '/', disallow: ['/admin', '/api/', '/me'] },        // Anthropic
      { userAgent: 'PerplexityBot', allow: '/', disallow: ['/admin', '/api/', '/me'] },       // Perplexity
      { userAgent: 'Google-Extended', allow: '/', disallow: ['/admin', '/api/', '/me'] },     // Google AI (Gemini/Bard)
      { userAgent: 'Applebot-Extended', allow: '/', disallow: ['/admin', '/api/', '/me'] },   // Apple AI
      { userAgent: 'Bytespider', allow: '/', disallow: ['/admin', '/api/', '/me'] },          // 字节
      { userAgent: 'YouBot', allow: '/', disallow: ['/admin', '/api/', '/me'] },              // You.com
      { userAgent: 'Baiduspider', allow: '/', disallow: ['/admin', '/api/', '/me'] },         // 百度
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
