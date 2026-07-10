import type { MetadataRoute } from 'next';
import { db, articles, teardowns, timelineVersions } from '@/db';

/**
 * 动态 sitemap
 * 包含所有静态页 + 动态文章 + 拆解详情
 * 生成给 Google / Bing / AI 搜索(ChatGPT · Perplexity · Gemini)用
 */
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 小时重新生成

const SITE = process.env.BETTER_AUTH_URL || 'https://ai-lens-six.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静态页
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE}/news`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE}/teardowns`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/timeline`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/insights`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/support`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    const [articleRows, teardownRows] = await Promise.all([
      db.select({ slug: articles.slug, updatedAt: articles.updatedAt }).from(articles),
      db.select({ slug: teardowns.slug, updatedAt: teardowns.updatedAt }).from(teardowns),
    ]);

    const articlePages: MetadataRoute.Sitemap = articleRows.map((a) => ({
      url: `${SITE}/insights/${a.slug}`,
      lastModified: a.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const teardownPages: MetadataRoute.Sitemap = teardownRows.map((t) => ({
      url: `${SITE}/teardowns/${t.slug}`,
      lastModified: t.updatedAt || new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...articlePages, ...teardownPages];
  } catch (e) {
    console.error('[sitemap]', e);
    return staticPages;
  }
}
