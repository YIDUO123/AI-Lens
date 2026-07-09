/**
 * /admin · 编辑后台入口(Batch 12 会填充完整内容)
 * 现在只做 3 件事:
 *  1. 通过中间件已过滤未登录用户
 *  2. 展示当前登录用户信息,作为登录成功的证明
 *  3. 显示占位内容
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { CheckCircle, ArrowRight, User as UserIcon, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?next=/admin');

  const user = session.user;
  const role = (user as any).role || 'reader';

  return (
    <div className="container max-w-4xl py-12">
      {/* 登录成功状态 */}
      <div className="mb-8 flex items-center gap-3 rounded-xl border-2 border-green-400 bg-green-50 px-6 py-4">
        <CheckCircle className="h-6 w-6 text-green-600" />
        <div>
          <div className="font-black">登录成功 🎉</div>
          <div className="text-sm text-ink-soft">下一步:Batch 11+12 会填充这个后台的实际内容</div>
        </div>
      </div>

      {/* 用户信息卡 */}
      <div className="rounded-2xl border-2 border-ink bg-cream p-8 shadow-brutal-lg">
        <div className="mb-6 flex items-center gap-4">
          {user.image ? (
            <img src={user.image} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-ink" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-ink bg-gradient-to-br from-coral to-gold text-2xl font-black text-white">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <div className="text-2xl font-black">{user.name}</div>
            <div className="text-sm text-ink-soft">刚刚从 better-auth 登录 · 已写入 Supabase 数据库</div>
          </div>
        </div>

        <div className="grid gap-3 text-sm">
          <Row icon={<UserIcon className="h-4 w-4" />} label="用户 ID" value={<span className="font-mono text-xs">{user.id}</span>} />
          <Row icon={<Mail className="h-4 w-4" />} label="邮箱" value={user.email} />
          <Row icon={<Shield className="h-4 w-4" />} label="角色" value={<span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-coral">{role}</span>} />
        </div>

        <div className="mt-8 border-t pt-6">
          <div className="text-xs font-black uppercase tracking-widest text-coral mb-2">下一步 · Batch 11-12</div>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>→ 迁移静态版本的所有页面到 Next.js(资讯 / 拆解 / 时间轴 / 洞察 / 关于)</li>
            <li>→ 数据从 JSON 文件迁到 Supabase Postgres 表</li>
            <li>→ 后台加"编辑内容"、"用户管理"、"评论审核"等功能</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-coral">
          返回首页 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-line pb-2">
      <div className="flex items-center gap-2 text-ink-soft">
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
