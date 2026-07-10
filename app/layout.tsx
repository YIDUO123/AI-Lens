import type { Metadata } from 'next';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { DonationBubble } from '@/components/support/donation-bubble';
import './globals.css';

const SITE = process.env.BETTER_AUTH_URL || 'https://ai-lens-six.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'AI Lens · 尝试看清 AI 产品的实质',
    template: '%s · AI Lens',
  },
  description:
    'AI Lens 是一个独立运营的 AI 情报站 —— 每日追踪 200+ 条 AI 动态,深度拆解主流模型与产品,以产品经理视角输出真正值得读的信号。覆盖 OpenAI · Anthropic · Google · Cursor 等家族。',
  keywords: [
    'AI', '人工智能', 'AI 产品', 'AI 资讯', 'AI 情报站',
    'ChatGPT', 'Claude', 'Gemini', 'GPT-5', 'AI PM',
    '产品经理', 'AI 产品经理', '模型对比', '产品拆解',
    'OpenAI', 'Anthropic', 'Google DeepMind', 'Cursor',
    'AI 洞察', 'AI 观察', 'AI 分析', 'AI 编码',
  ],
  authors: [{ name: 'Alex', url: `${SITE}/about` }],
  creator: 'Alex',
  publisher: 'AI Lens',
  category: '科技',

  // Open Graph(微信/微博/Telegram 等分享预览)
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE,
    siteName: 'AI Lens',
    title: 'AI Lens · 尝试看清 AI 产品的实质',
    description: '每日 200+ AI 动态过滤 · 模型深度对比 · PM 视角的独立洞察。看得多不如看得懂。',
    images: [
      {
        url: '/opengraph-image',   // 由 opengraph-image.tsx 动态生成
        width: 1200,
        height: 630,
        alt: 'AI Lens · 尝试看清 AI 产品的实质',
      },
    ],
  },

  // Twitter/X 卡片
  twitter: {
    card: 'summary_large_image',
    title: 'AI Lens · 尝试看清 AI 产品的实质',
    description: '每日 AI 动态过滤 · 模型对比 · PM 视角的独立洞察。',
    images: ['/opengraph-image'],
    creator: '@YIDUO123',
  },

  // 允许被索引 + AI 搜索引擎读取
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // 备用 favicon(如有需求可自定义)
  icons: {
    icon: '/favicon.ico',
  },

  // 站点验证(以后要接入 Google Search Console / Baidu 验证时填)
  verification: {},

  // Alternate 版本
  alternates: {
    canonical: SITE,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* JSON-LD 结构化数据 · 组织信息(帮助 Google Knowledge Graph + AI 搜索理解你是谁)*/}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'AI Lens',
              url: SITE,
              description: 'AI Lens 是一个独立运营的 AI 情报站 · 每日追踪 200+ 条 AI 动态 · 深度拆解主流模型与产品',
              inLanguage: 'zh-CN',
              publisher: {
                '@type': 'Organization',
                name: 'AI Lens',
                url: SITE,
                logo: `${SITE}/opengraph-image`,
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: `${SITE}/search?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen">
        <Nav />
        <main>{children}</main>
        <Footer />
        <DonationBubble />
      </body>
    </html>
  );
}
