/**
 * 通用骨架屏 · 路由切换瞬间显示 · 无需等 server 响应
 * Next.js App Router 会自动在 loading.tsx 和真页面之间做 Suspense
 */
export function PageSkeleton({ variant = 'list' }: { variant?: 'list' | 'article' | 'grid' | 'admin' }) {
  return (
    <div className="container max-w-5xl py-10 pb-24 animate-pulse">
      {/* 顶部标题条 */}
      <div className="mb-8">
        <div className="h-3 w-24 bg-coral/20 rounded mb-3" />
        <div className="h-10 w-2/3 bg-ink/10 rounded mb-3" />
        <div className="h-4 w-1/2 bg-ink/5 rounded" />
      </div>

      {variant === 'list' && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-cream border-2 border-ink/10 rounded-xl" />
          ))}
        </div>
      )}

      {variant === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-cream border-2 border-ink/10 rounded-xl" />
          ))}
        </div>
      )}

      {variant === 'article' && (
        <div className="space-y-3 max-w-3xl">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={`h-4 bg-ink/5 rounded ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-11/12' : 'w-4/5'}`} />
          ))}
        </div>
      )}

      {variant === 'admin' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-cream border-2 border-ink/10 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-cream border-2 border-ink/10 rounded-2xl" />
            <div className="h-64 bg-cream border-2 border-ink/10 rounded-2xl" />
          </div>
        </>
      )}
    </div>
  );
}
