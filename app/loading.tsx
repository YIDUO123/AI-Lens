export default function Loading() {
  return (
    <div className="container py-24 text-center">
      <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-coral/20 border-t-coral" />
      <p className="text-ink-soft">加载中…</p>
      <p className="mt-2 text-xs text-muted-foreground">
        首次访问 Next.js dev server 需要编译,请等 5-15 秒
      </p>
    </div>
  );
}
