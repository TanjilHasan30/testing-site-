import React, { useState } from 'react';
import { Bookmark, Heart, Image as ImageIcon, Play, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORY_LABELS, t } from '../i18n/translations';
import { formatCount, resolveVideoMedia } from '../lib/domain';
import type { PostItem } from '../types/platform';

export interface EnrichedPost extends PostItem {
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowingAuthor?: boolean;
}

interface PostCardProps {
  post: EnrichedPost;
  onOpen: (post: EnrichedPost) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onOpen, onToggleLike, onToggleSave }) => {
  const { lang } = useApp();
  const [imgError, setImgError] = useState(false);
  const [popping, setPopping] = useState(false);

  const title = lang === 'bn' ? post.titleBn : post.titleEn;
  const catLabel = CATEGORY_LABELS[post.category]?.[lang] ?? post.category;

  const aspectClass =
    post.aspectRatio === '3:4'
      ? 'aspect-[3/4]'
      : post.aspectRatio === '16:9'
        ? 'aspect-video'
        : post.aspectRatio === '1:1'
          ? 'aspect-square'
          : 'aspect-[4/3]';

  const durationText = post.videoDurationSec
    ? `${Math.floor(post.videoDurationSec / 60)}:${String(post.videoDurationSec % 60).padStart(2, '0')}`
    : null;

  const handleLikeClick = () => {
    setPopping(true);
    window.setTimeout(() => setPopping(false), 260);
    onToggleLike(post.id);
  };

  const { posterSrc } = resolveVideoMedia(post.mediaUrls);
  const thumbSrc = post.isVideo ? posterSrc : post.mediaUrls[0];

  return (
    <article className="group break-inside-avoid mb-4 bg-white rounded-2xl overflow-hidden border border-[#ECEAF0] shadow-[0_2px_10px_rgba(41,36,59,0.04)] hover:shadow-[0_12px_28px_rgba(41,36,59,0.1)] transition-all duration-200 hover:-translate-y-0.5">
      <div className={`relative w-full ${aspectClass} bg-[#FFE3D9]/40 overflow-hidden`}>
        <button
          type="button"
          onClick={() => onOpen(post)}
          aria-label={title}
          className="w-full h-full block text-left focus-visible:outline-2 focus-visible:outline-[#FF6478]"
        >
          {!imgError && thumbSrc ? (
            <img
              src={thumbSrc}
              alt={title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#FFE3D9] to-[#FAF9F6]">
              <ImageIcon className="w-7 h-7 text-[#D93B52]/65 mb-2" />
              <span className="text-xs font-medium text-[#29243B]/80 line-clamp-2">{title}</span>
            </div>
          )}

          {/* Subtle Desktop Hover Scrim */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute inset-0 bg-gradient-to-t from-[#29243B]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          />
        </button>

        {/* Video Duration Indicator */}
        {post.isVideo && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#29243B]/80 backdrop-blur-xs text-white text-[11px] font-medium pointer-events-none">
            <Play className="w-3 h-3 fill-white" />
            {durationText && <span className="tabular-nums">{durationText}</span>}
          </div>
        )}

        {/* Quick Save Button on Desktop Hover */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(post.id);
            }}
            aria-label={`${post.isSaved ? t(lang, 'saved') : t(lang, 'save')} ${title}`}
            className={`hidden md:inline-flex items-center gap-1 absolute top-2.5 left-2.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 ${
              post.isSaved
                ? 'bg-[#29243B] text-white opacity-100'
                : 'bg-white/95 text-[#29243B] opacity-0 group-hover:opacity-100 hover:bg-[#E83F58] hover:text-white'
            }`}
          >
            <Bookmark className={`w-3 h-3 ${post.isSaved ? 'fill-white' : ''}`} />
            <span>{post.isSaved ? t(lang, 'saved') : t(lang, 'save')}</span>
          </button>
        )}

        {/* Product Tag Indicator */}
        {post.taggedProductIds.length > 0 && (
          <button
            type="button"
            onClick={() => onOpen(post)}
            aria-label="View tagged product"
            className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-xl bg-white/95 text-[#29243B] flex items-center justify-center shadow-sm hover:bg-[#FFE3D9] transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#D93B52]" />
          </button>
        )}
      </div>

      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-[#777486]">
          <span>{catLabel}</span>
          {post.isSponsored && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-[#D93B52]">{t(lang, 'sponsored')}</span>
            </>
          )}
        </div>

        <button type="button" onClick={() => onOpen(post)} className="text-left block w-full">
          <h3 className="text-sm font-semibold text-[#29243B] leading-snug line-clamp-2 hover:text-[#D93B52] transition-colors">
            {title}
          </h3>
        </button>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => onOpen(post)}
            className="flex items-center gap-2 min-w-0 text-left"
          >
            <img
              src={post.authorAvatar || '/icon.svg'}
              alt={post.authorName}
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-full object-cover bg-[#FFE3D9] shrink-0"
            />
            <span className="text-xs text-[#777486] truncate">{post.authorName}</span>
          </button>

          <button
            type="button"
            onClick={handleLikeClick}
            aria-label={`${t(lang, 'likes')} ${title}`}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors min-h-[32px] ${
              post.isLiked
                ? 'text-[#D93B52] bg-[#FFE3D9]/70'
                : 'text-[#777486] hover:bg-[#FAF9F6] hover:text-[#29243B]'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${popping ? 'animate-heart-pop' : ''} ${
                post.isLiked ? 'fill-[#FF6478] text-[#FF6478]' : ''
              }`}
            />
            <span className="tabular-nums">{formatCount(post.likesCount, lang)}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
