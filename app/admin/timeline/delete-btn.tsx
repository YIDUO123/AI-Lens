'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteTimelineVersion } from '@/lib/actions/timeline';

export function DeleteBtn({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const doDelete = () => {
    if (!confirm(`确认删除 "${title}"?`)) return;
    startTransition(async () => {
      try {
        await deleteTimelineVersion(id);
        router.refresh();
      } catch (e: any) {
        alert(e.message);
      }
    });
  };

  return (
    <button type="button" onClick={doDelete} disabled={pending} className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-50">
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}
