import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Flag,
  Heart,
  MessageCircle,
  Send,
  Share2,
  ShieldAlert,
  ShoppingBag,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORY_LABELS, t } from '../i18n/translations';
import { formatBdt, formatCount, isVideoMediaUrl, resolveVideoMedia } from '../lib/domain';
import type { CommentItem, ProductItem } from '../types/platform';
import type { EnrichedPost } from './PostCard';

interface PostDetailModalProps {
  post: EnrichedPost | null;
  onClose: () => void;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onFollow: (authorId: string) => void;
  onBlock: (authorId: string) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  onClose,
  onLike,
  onSave,
  onFollow,
  onBlock,
}) => {
  const { lang, apiFetch, addToCart, showToast } = useApp();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [taggedProducts, setTaggedProducts] = useState<ProductItem[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!post) return;
    setActiveSlide(0);
    apiFetch<CommentItem[]>(`/api/v1/posts/${post.id}/comments`)
      .then(setComments)
      .catch(() => setComments([]));

    if (post.taggedProductIds.length > 0) {
      apiFetch<{ products: ProductItem[] }>('/api/v1/products')
        .then((res) => {
          setTaggedProducts(res.products.filter((p) => post.taggedProductIds.includes(p.id)));
        })
        .catch(() => setTaggedProducts([]));
    } else {
      setTaggedProducts([]);
    }
  }, [post, apiFetch]);

  if (!post) return null;

  const title = lang === 'bn' ? post.titleBn : post.titleEn;
  const caption = lang === 'bn' ? post.captionBn : post.captionEn;
  const catLabel = CATEGORY_LABELS[post.category]?.[lang] ?? post.category;

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const created = await apiFetch<CommentItem>(`/api/v1/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      setComments((prev) => [created, ...prev]);
      setCommentText('');
      showToast(lang === 'bn' ? 'মন্তব্য যোগ হয়েছে' : 'Comment posted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    try {
      await apiFetch('/api/v1/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'post',
          targetId: post.id,
          reason: 'Community review requested',
          details: `Reported from post detail: ${post.titleEn}`,
        }),
      });
      showToast(lang === 'bn' ? 'রিপোর্টটি মডারেশন টিমের কাছে পাঠানো হয়েছে' : 'Report sent to moderation queue');
    } catch {
      showToast('Could not submit report');
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    showToast(lang === 'bn' ? 'লিংক কপি করা হয়েছে' : 'Post link copied');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 bg-[#29243B]/60 backdrop-blur-xs flex items-center justify-center p-2 md:p-6"
    >
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl overflow-hidden flex flex-col md:flex-row border border-[#ECEAF0] shadow-2xl animate-sheet-in">
        {/* Media Column */}
        <div className="md:w-[54%] bg-[#29243B] relative flex items-center justify-center min-h-[260px] md:min-h-[540px]">
          {(() => {
            const currentMedia = post.mediaUrls[activeSlide] || post.mediaUrls[0];
            const { posterSrc } = resolveVideoMedia(post.mediaUrls);
            if (currentMedia && isVideoMediaUrl(currentMedia)) {
              return (
                <video
                  src={currentMedia}
                  poster={posterSrc}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full max-h-[45vh] md:max-h-[92vh] object-contain"
                />
              );
            }
            return (
              <img
                src={currentMedia || posterSrc}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full h-full max-h-[45vh] md:max-h-[92vh] object-contain"
              />
            );
          })()}
          {post.mediaUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-[#29243B]/70 px-3 py-1.5 rounded-xl">
              {post.mediaUrls.map((_u, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`w-2 h-2 rounded-full ${i === activeSlide ? 'bg-[#FF6478]' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close post detail"
            className="md:hidden absolute top-3 right-3 w-10 h-10 rounded-full bg-[#29243B]/75 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Comments Column */}
        <div className="md:w-[46%] flex flex-col max-h-[50vh] md:max-h-[92vh] bg-[#FAF9F6]">
          <div className="p-4 border-b border-[#ECEAF0] flex items-center justify-between gap-3 bg-white">
            <Link
              to={`/creators/${post.authorUsername}`}
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0"
            >
              <img
                src={post.authorAvatar || '/icon.svg'}
                alt={post.authorName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover bg-[#FFE3D9]"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#29243B] truncate">{post.authorName}</p>
                <p className="text-xs text-[#777486] truncate">@{post.authorUsername}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onFollow(post.authorId)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  post.isFollowingAuthor
                    ? 'bg-[#B8A5F5]/25 text-[#29243B]'
                    : 'bg-[#E83F58] text-white hover:bg-[#D6324B]'
                }`}
              >
                {post.isFollowingAuthor ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    {t(lang, 'following')}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    {t(lang, 'follow')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close post detail"
                className="hidden md:inline-flex w-9 h-9 rounded-xl items-center justify-center hover:bg-[#FAF9F6] text-[#29243B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#777486]">
                <span>{catLabel}</span>
                {post.location && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{post.location}</span>
                  </>
                )}
                {post.isSponsored && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#D93B52] font-medium">{t(lang, 'sponsored')}</span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-semibold text-[#29243B] leading-snug">{title}</h2>
              <p className="text-sm text-[#29243B]/85 leading-relaxed">{caption}</p>
              {post.hashtags.length > 0 && (
                <p className="text-xs text-[#D93B52] font-medium">
                  {post.hashtags.map((h) => `#${h}`).join(' ')}
                </p>
              )}
            </div>

            {taggedProducts.length > 0 && (
              <div className="bg-white rounded-2xl p-3.5 border border-[#ECEAF0] space-y-2.5">
                <p className="text-xs font-semibold text-[#777486] flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#D93B52]" />
                  {lang === 'bn' ? 'এই পোস্টের ট্যাগ করা পণ্য' : 'Tagged Products'}
                </p>
                {taggedProducts.map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between gap-3">
                    <Link
                      to={`/products/${prod.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      <img
                        src={prod.imageUrl}
                        alt={prod.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#29243B] truncate">
                          {lang === 'bn' ? prod.titleBn : prod.titleEn}
                        </p>
                        <p className="text-xs font-semibold text-[#D93B52] tabular-nums">
                          {formatBdt(prod.priceBdt, lang)}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        addToCart({
                          productId: prod.id,
                          variant: prod.variants[0] || 'Standard',
                          quantity: 1,
                          affiliateCode: post.authorId,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#29243B] text-white text-xs font-medium shrink-0 hover:bg-[#E83F58] transition-colors"
                    >
                      {t(lang, 'addToCart')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-y border-[#ECEAF0] py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onLike(post.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium ${
                    post.isLiked ? 'bg-[#FFE3D9] text-[#D93B52]' : 'hover:bg-white text-[#777486]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-[#FF6478] text-[#FF6478]' : ''}`} />
                  <span className="tabular-nums">{formatCount(post.likesCount, lang)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSave(post.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium ${
                    post.isSaved ? 'bg-[#B8A5F5]/25 text-[#29243B]' : 'hover:bg-white text-[#777486]'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-[#29243B]' : ''}`} />
                  <span>{post.isSaved ? t(lang, 'saved') : t(lang, 'save')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label={t(lang, 'share')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white text-[#777486]"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleReport}
                  title={t(lang, 'report')}
                  aria-label={t(lang, 'report')}
                  className="p-2 rounded-xl text-[#777486] hover:text-[#D93B52]"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onBlock(post.authorId);
                    onClose();
                  }}
                  title={t(lang, 'block')}
                  aria-label={t(lang, 'block')}
                  className="p-2 rounded-xl text-[#777486] hover:text-[#29243B]"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#777486] flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                {t(lang, 'comments')} ({formatCount(comments.length, lang)})
              </p>
              {comments.length === 0 ? (
                <p className="text-xs text-[#777486]">
                  {lang === 'bn' ? 'প্রথম মন্তব্যটি আপনি লিখুন।' : 'Be the first mother to share a comment.'}
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl p-3 border border-[#ECEAF0] space-y-1">
                    <div className="flex items-center gap-2">
                      <img
                        src={c.authorAvatar || '/icon.svg'}
                        alt={c.authorName}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-xs font-semibold text-[#29243B]">{c.authorName}</span>
                    </div>
                    <p className="text-xs text-[#29243B]/85 leading-relaxed pl-7">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCommentSubmit} className="p-3 bg-white border-t border-[#ECEAF0] flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={lang === 'bn' ? 'আপনার মন্তব্য লিখুন...' : 'Write a warm comment...'}
              aria-label="Comment text"
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              aria-label="Send comment"
              className="px-4 py-2 rounded-xl bg-[#29243B] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#E83F58] transition-colors inline-flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
