'use client';

import { useState, useTransition } from 'react';
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

  const onClick = () => {
    if (!isLoggedIn) {
      router.push('/sign-in?next=' + encodeURIComponent(window.location.pathname));
      return;
    }
    // 乐观更新
    const next = !liked;
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

  const onClick = () => {
    if (!isLoggedIn) {
      router.push('/sign-in?next=' + encodeURIComponent(window.location.pathname));
      return;
    }
    const next = !saved;
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
