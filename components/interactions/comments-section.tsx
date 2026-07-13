'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2, Send, Trash2, MessageCircle, LogIn } from 'lucide-react';
import { postComment, deleteComment, type TargetType } from '@/lib/actions/interactions';

type CommentItem = {
  id: string;
  body: string;
  userId: string;
  parentId: string | null;
  isEditorPick: boolean;
  createdAt: Date | string;
  userName: string | null;
  userImage: string | null;
  userRole: string | null;
};

export function CommentsSection({
  targetType,
  targetId,
  comments: initialComments,
  currentUserId,
  isAdmin,
}: {
  targetType: TargetType;
  targetId: string;
  comments: CommentItem[];
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!currentUserId;

  const submit = () => {
    setError(null);
    if (!body.trim()) return;
    // EdgeOne 兼容:不用 router.refresh · 直接本地追加返回的新评论
    startTransition(async () => {
      try {
        const newComment = await postComment({ targetType, targetId, body, parentId: replyTo || undefined });
        setComments((cs) => [...cs, newComment]);
        setBody('');
        setReplyTo(null);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm('删除这条评论?')) return;
    startTransition(async () => {
      try {
        await deleteComment(id);
        // 递归删掉这条 + 所有子回复
        setComments((cs) => {
          const toRemove = new Set<string>([id]);
          let changed = true;
          while (changed) {
            changed = false;
            for (const c of cs) {
              if (c.parentId && toRemove.has(c.parentId) && !toRemove.has(c.id)) {
                toRemove.add(c.id);
                changed = true;
              }
            }
          }
          return cs.filter((c) => !toRemove.has(c.id));
        });
      } catch (e: any) {
        alert(e.message);
      }
    });
  };

  // 构建树形结构
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = new Map<string, CommentItem[]>();
  for (const c of comments) {
    if (c.parentId) {
      const arr = replies.get(c.parentId) || [];
      arr.push(c);
      replies.set(c.parentId, arr);
    }
  }

  return (
    <section className="mt-10 pt-8 border-t-2 border-dashed border-line">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-black flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-coral" /> 读者讨论
          <span className="text-sm font-mono font-normal text-muted-foreground bg-bg-alt px-2 py-0.5 rounded">
            {comments.length}
          </span>
        </h3>
      </div>

      {/* 评论输入 */}
      {!isLoggedIn ? (
        <div className="bg-bg-alt rounded-xl p-6 text-center border-2 border-dashed border-line mb-8">
          <p className="text-sm text-ink-soft mb-3">
            登录后即可发表想法 · <b className="text-ink">支持树形回复</b> · 编辑观点会加 ⭐ 标注
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-y-0.5 transition"
          >
            <LogIn className="w-3.5 h-3.5" /> 登录 / 注册
          </Link>
        </div>
      ) : (
        <div className="mb-8 bg-cream border-2 border-ink rounded-xl p-4 shadow-brutal-sm">
          {replyTo && (
            <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
              回复
              <button onClick={() => setReplyTo(null)} className="underline hover:text-ink">取消</button>
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="说点什么…(支持反对 / 补充 / '你哪里想错了')"
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 bg-white border border-line rounded-lg focus:border-coral outline-none text-sm resize-none"
          />
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
          <div className="flex justify-between items-center mt-3">
            <span className="text-[11px] text-muted-foreground">{body.length}/2000</span>
            <button
              onClick={submit}
              disabled={pending || !body.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-ink text-background rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-ink/90"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              发表
            </button>
          </div>
        </div>
      )}

      {/* 评论列表 */}
      {topLevel.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">
          还没有评论 · 第一个发言的会被加精 ⭐
        </p>
      ) : (
        <div className="space-y-5">
          {topLevel.map((c) => (
            <CommentCard
              key={c.id}
              c={c}
              replies={replies.get(c.id) || []}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onReply={(id) => { setReplyTo(id); document.querySelector('textarea')?.focus(); }}
              onDelete={remove}
              allReplies={replies}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CommentCard({
  c, replies, currentUserId, isAdmin, onReply, onDelete, allReplies,
}: {
  c: CommentItem;
  replies: CommentItem[];
  currentUserId: string | null;
  isAdmin: boolean;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  allReplies: Map<string, CommentItem[]>;
}) {
  const canDelete = currentUserId === c.userId || isAdmin;
  const initial = c.userName?.[0]?.toUpperCase() || '?';
  const role = c.userRole || 'reader';
  const roleClass = role === 'admin' ? 'bg-coral text-white' : role === 'editor' ? 'bg-gold text-ink' : 'bg-bg-alt text-ink-soft';

  return (
    <article className="bg-cream border border-line rounded-xl p-4">
      <div className="flex items-start gap-3">
        {c.userImage ? (
          <img src={c.userImage} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-coral to-gold grid place-items-center text-white font-black text-sm flex-shrink-0">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-sm">{c.userName || '匿名'}</span>
            <span className={`text-[9px] font-black tracking-widest uppercase px-1.5 py-0 rounded ${roleClass}`}>{role}</span>
            {c.isEditorPick && (
              <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0 rounded bg-gold text-ink">⭐ 编辑精选</span>
            )}
            <span className="text-[10px] text-muted-foreground">· {fmtTime(c.createdAt)}</span>
          </div>
          <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{c.body}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {currentUserId && (
              <button onClick={() => onReply(c.id)} className="hover:text-coral font-semibold">
                回复
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(c.id)} className="hover:text-red-600 inline-flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> 删除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 子回复 · 缩进递归 */}
      {replies.length > 0 && (
        <div className="mt-4 ml-8 space-y-3 pl-3 border-l-2 border-dashed border-line">
          {replies.map((r) => (
            <CommentCard
              key={r.id}
              c={r}
              replies={allReplies.get(r.id) || []}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onReply={onReply}
              onDelete={onDelete}
              allReplies={allReplies}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function fmtTime(date: Date | string) {
  const d = new Date(date);
  const diffM = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffM < 1) return '刚刚';
  if (diffM < 60) return `${diffM} 分钟前`;
  const h = Math.round(diffM / 60);
  if (h < 24) return `${h} 小时前`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} 天前`;
  return `${d.getMonth() + 1}.${d.getDate()}`;
}
