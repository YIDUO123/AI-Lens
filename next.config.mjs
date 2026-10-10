/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    reactCompiler: false,
    // 客户端路由缓存:页面间切换复用 RSC payload 更久 → "切换"近乎即时
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
    // 桶装 import 优化:lucide-react / motion 的 barrel export 树摇
    optimizePackageImports: ['lucide-react', 'motion', 'motion/react'],
  },
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
