'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { User, LogOut, Bookmark, Settings, LogIn, ChevronDown } from 'lucide-react';

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  if (isPending) {
    return <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg border-2 border-black hover:bg-black hover:text-white transition-all"
      >
        <LogIn className="w-4 h-4" />
        登录
      </Link>
    );
  }

  const user = session.user;
  const initial = user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  const role = (user as any).role || 'reader';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border-2 border-black hover:bg-gray-50 transition-all"
      >
        {user.image ? (
          <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FFB84D] grid place-items-center text-white font-black text-sm">
            {initial}
          </div>
        )}
        <span className="text-sm font-bold max-w-[80px] truncate">{user.name || 'User'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0_#1a1a1a] py-2 z-50">
          {/* 用户信息头 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-black">{user.name || 'User'}</div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
            <div className="mt-1.5 inline-block px-2 py-0.5 text-[10px] font-black tracking-widest uppercase bg-[#FFEEDD] text-[#FF6B35] rounded">
              {role}
            </div>
          </div>

          {/* 菜单 */}
          <div className="py-1">
            <MenuItem href="/me" icon={<User className="w-4 h-4" />}>我的主页</MenuItem>
            <MenuItem href="/me#saves" icon={<Bookmark className="w-4 h-4" />}>我的收藏</MenuItem>
            {(role === 'editor' || role === 'admin') && (
              <MenuItem href="/admin" icon={<Settings className="w-4 h-4" />}>编辑后台</MenuItem>
            )}
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              onClick={async () => {
                await signOut();
                // 用完整刷新代替 router.refresh() · 更稳 · 也能清干净所有 client state
                window.location.href = '/';
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition"
    >
      <span className="text-gray-500">{icon}</span>
      {children}
    </Link>
  );
}
