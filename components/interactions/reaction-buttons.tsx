'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck, Heart, Loader2 } from 'lucide-react';
import { toggleSave, toggleLike, type TargetType } from '@/lib/actions/interactions';

type Props = {
  targetType: TargetType;
  targetId: string;
  initialSaved?: boolean;
  initialLiked?: boolean;
  saveCount?: number;
  likeCount?: number;
  isLoggedIn: boolean;
  size?: 'sm' | 'md';
  showCount?: boolean;
  variant?: 'default' | 'ghost';
};

/**
 * 用户交互状态异步补齐 · ISR 页面用
 * UserInteractionsLoader 拉到当前用户的赞/藏后派发全局事件,按钮各自认领;
 * 用户点过(乐观更新)之后不再被事件覆盖
 */
function useInteractionsSync(
  targetType: TargetType,
  targetId: string,
  apply: (s: { liked?: boolean; saved?: boolean }) => void,
) {
  const touched = useRef(false);
  useEffect(() => {
    const onEvent = (e: Event) => {
      if (touched.current) return;
      const detail = (e as CustomEvent<{ targetType: TargetType; likedIds: string[]; savedIds: string[] }>).detail;
      if (!detail || detail.targetType !== targetType) return;
      apply({
        liked: detail.likedIds?.includes(targetId) || undefined,
        saved: detail.savedIds?.includes(targetId) || undefined,
      });
    };
    window.addEventListener('ailens:interactions', onEvent);
    return () => window.removeEventListener('ailens:interactions', onEvent);
  }, [targetType, targetId, apply]);
  return { markTouched: () => { touched.current = true; } };
}

/** 登录态:ISR 页面无法服务端判定,由 UserInteractionsLoader 写入全局标记 */
function isLoggedInNow(propValue: boolean): boolean {
  const flag = (window as any).__ailensLoggedIn;
  if (flag === false) return false;
  return propValue || flag === true;
}

/**
 * 点赞按钮
 */
export function LikeButton({
  targetType, targetId, initialLiked = false, likeCount = 0,
  isLoggedIn, size = 'md', showCount = true, variant = 'default',
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(likeCount);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { markTouched } = useInteractionsSync(targetType, targetId, ({ liked: l }) => {
    if (l !== undefined) setLiked(l);
  });

  const onClick = () => {
    if (!isLoggedInNow(isLoggedIn)) {
      router.push('/sign-in?next=' + encodeURIComponent(window.location.pathname));
      return;
    }
    // 乐观更新
    const next = !liked;
    markTouched();
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      try {
        await toggleLike(targetType, targetId);
      } catch (e) {
        setLiked(liked);
        setCount(count);
      }
    });
  };

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-xs'
    : 'px-3 py-1.5 text-sm';

  const variantClasses = variant === 'ghost'
    ? liked
      ? 'text-coral hover:bg-coral/10'
      : 'text-ink-soft hover:text-coral hover:bg-coral/5'
    : liked
      ? 'bg-coral/10 text-coral border border-coral'
      : 'border border-line text-ink-soft hover:border-coral hover:text-coral';

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition ${sizeClasses} ${variantClasses}`}
      aria-label={liked ? '取消点赞' : '点赞'}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-coral' : ''}`} />
      )}
      {showCount && <span>{count}</span>}
    </button>
  );
}

/**
 * 收藏按钮
 */
export function SaveButton({
  targetType, targetId, initialSaved = false, saveCount = 0,
  isLoggedIn, size = 'md', showCount = false, variant = 'default',
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(saveCount);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { markTouched } = useInteractionsSync(targetType, targetId, ({ saved: s }) => {
    if (s !== undefined) setSaved(s);
  });

  const onClick = () => {
    if (!isLoggedInNow(isLoggedIn)) {
      router.push('/sign-in?next=' + encodeURIComponent(window.location.pathname));
      return;
    }
    const next = !saved;
    markTouched();
    setSaved(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      try {
        await toggleSave(targetType, targetId);
      } catch (e) {
        setSaved(saved);
        setCount(count);
      }
    });
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  const variantClasses = variant === 'ghost'
    ? saved
      ? 'text-gold hover:bg-gold/10'
      : 'text-ink-soft hover:text-gold hover:bg-gold/5'
    : saved
      ? 'bg-gold text-ink border border-ink font-bold'
      : 'border border-line text-ink-soft hover:border-ink hover:text-ink';

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition ${sizeClasses} ${variantClasses}`}
      aria-label={saved ? '取消收藏' : '收藏'}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="w-3.5 h-3.5" />
      ) : (
        <Bookmark className="w-3.5 h-3.5" />
      )}
      {showCount && count > 0 && <span>{count}</span>}
      {size !== 'sm' && !showCount && <span>{saved ? '已收藏' : '收藏'}</span>}
    </button>
  );
}
