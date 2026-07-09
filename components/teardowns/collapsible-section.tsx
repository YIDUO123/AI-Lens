'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * 可折叠 section 包装
 * 标题栏可点击 · 折叠/展开状态本地持久
 */
export function CollapsibleSection({
  id,
  storageKey,
  head,
  children,
}: {
  id: string;
  storageKey: string;
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex-1">{head}</div>
        <button
          className="flex-shrink-0 w-9 h-9 rounded-full border-2 border-ink bg-cream grid place-items-center hover:bg-ink hover:text-background transition shadow-brutal-sm"
          aria-label={collapsed ? '展开' : '折叠'}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100 mt-6'
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
