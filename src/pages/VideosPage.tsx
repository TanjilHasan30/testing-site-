import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Heart,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Plus,
  Send,
  Share2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import {
  filterVideoPosts,
  formatBdt,
  formatCount,
  getAdjacentVideoIndices,
  resolveVideoMedia,
  type VideoFeedMode,
} from '../lib/domain';
import type { CommentItem, ProductItem } from '../types/platform';
import type { EnrichedPost } from '../components/PostCard';

export const VideosPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialMode: VideoFeedMode =
    tabParam === 'following' || tabParam === 'trending' ? tabParam : 'for_you';

  const [allVideos, setAllVideos] = useState<EnrichedPost[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [mode, setMode] = useState<VideoFeedMode>(initialMode);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [popping, setPopping] = useState(false);
  const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next');
  const [playFeedback, setPlayFeedback] = useState<'play' | 'pause' | null>(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastWheelAtRef = useRef<number>(0);
  const restoredRef = useRef(false);
  const pendingRestoreTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const nextTab: VideoFeedMode =
      tabParam === 'following' || tabParam === 'trending' ? tabParam : 'for_you';
    setMode((prev) => {
      if (prev !== nextTab) {
        setIndex(0);
      }
      return nextTab;
    });
  }, [tabParam]);

  useEffect(() => {
    Promise.all([
      apiFetch<{ items: EnrichedPost[] }>(`/api/v1/feed?tab=videos&lang=${lang}&limit=30`),
      apiFetch<{ products: ProductItem[] }>('/api/v1/products'),
    ])
      .then(([feedRes, prodRes]) => {
        setAllVideos(Array.isArray(feedRes?.items) ? feedRes.items : []);
        setProducts(Array.isArray(prodRes?.products) ? prodRes.products : []);
      })
      .catch(() => setAllVideos([]))
      .finally(() => setLoading(false));
  }, [apiFetch, lang]);

  const videos = useMemo(
    () =>
      filterVideoPosts(
        allVideos,
        { mode, category: 'all', preferredLang: lang },
        (post) => Boolean(post.isFollowingAuthor)
      ),
    [allVideos, mode, lang]
  );

  // Restore video position & timestamp when returning from Product Detail or ?v= query
  useEffect(() => {
    if (restoredRef.current || videos.length === 0) return;
    const state = location.state as { restoreVideoId?: string; restoreTime?: number } | null;
    const targetId = state?.restoreVideoId || searchParams.get('v');
    if (targetId) {
      const foundIdx = videos.findIndex((v) => v.id === targetId);
      if (foundIdx >= 0) {
        setIndex(foundIdx);
      }
      if (typeof state?.restoreTime === 'number' && state.restoreTime > 0) {
        pendingRestoreTimeRef.current = state.restoreTime;
      }
      restoredRef.current = true;
    }
  }, [videos, location.state, searchParams]);

  // Clamp index when switching tabs
  useEffect(() => {
    if (index >= videos.length && videos.length > 0) {
      setIndex(0);
    }
  }, [index, videos.length]);

  const current = videos[index];

  // Reset media state on reel change
  useEffect(() => {
    setMediaLoaded(false);
    setVideoError(false);
    setProgress(0);
    setCaptionExpanded(false);
    setReplyTo(null);
    setPlaying(true);
  }, [current?.id]);

  const activeMedia = useMemo(
    () => resolveVideoMedia(current?.mediaUrls ?? []),
    [current?.mediaUrls]
  );

  const nextVideoMedia = useMemo(() => {
    if (videos.length <= 1) return null;
    const nextIdx = Math.min(videos.length - 1, index + 1);
    if (nextIdx === index) return null;
    return resolveVideoMedia(videos[nextIdx]?.mediaUrls ?? []);
  }, [videos, index]);

  // Sync HTML5 <video> element playback and pause when leaving feed or tab hidden
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (playing && activeMedia.videoSrc && !videoError) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [playing, activeMedia.videoSrc, videoError, current?.id]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        videoRef.current?.pause();
        setPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      videoRef.current?.pause();
    };
  }, []);

  // Preload adjacent video posters efficiently
  useEffect(() => {
    if (videos.length <= 1) return;
    const adjacent = getAdjacentVideoIndices(index, videos.length);
    for (const adjIdx of adjacent) {
      const { posterSrc } = resolveVideoMedia(videos[adjIdx]?.mediaUrls ?? []);
      if (posterSrc) {
        const preloader = new Image();
        preloader.src = posterSrc;
      }
    }
  }, [index, videos]);

  useEffect(() => {
    if (!playing || videos.length === 0) return;
    if (activeMedia.videoSrc && !videoError) return;
    const id = window.setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 500);
    return () => window.clearInterval(id);
  }, [playing, videos.length, activeMedia.videoSrc, videoError]);

  useEffect(() => {
    if (!current || !commentsOpen) return;
    apiFetch<CommentItem[]>(`/api/v1/posts/${current.id}/comments`)
      .then((items) => setComments(Array.isArray(items) ? items : []))
      .catch(() => setComments([]));
  }, [current, commentsOpen, apiFetch]);

  const switchMode = (nextMode: VideoFeedMode) => {
    setMode(nextMode);
    setIndex(0);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', nextMode);
        return next;
      },
      { replace: true }
    );
  };

  const goNext = () => {
    setSlideDir('next');
    setIndex((i) => Math.min(videos.length - 1, i + 1));
    setProgress(0);
    setCommentsOpen(false);
  };

  const goPrev = () => {
    setSlideDir('prev');
    setIndex((i) => Math.max(0, i - 1));
    setProgress(0);
    setCommentsOpen(false);
  };

  const togglePlayTap = () => {
    setPlaying((prev) => {
      const next = !prev;
      setPlayFeedback(next ? 'play' : 'pause');
      window.setTimeout(() => setPlayFeedback(null), 550);
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (commentsOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayTap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleLike = async () => {
    if (!current) return;
    setPopping(true);
    window.setTimeout(() => setPopping(false), 260);
    const res = await apiFetch<{ isLiked: boolean; likesCount: number }>(`/api/v1/posts/${current.id}/like`, {
      method: 'POST',
    });
    setAllVideos((prev) =>
      prev.map((v) => (v.id === current.id ? { ...v, isLiked: res.isLiked, likesCount: res.likesCount } : v))
    );
  };

  const handleSave = async () => {
    if (!current) return;
    const res = await apiFetch<{ isSaved: boolean; savesCount: number }>(`/api/v1/posts/${current.id}/save`, {
      method: 'POST',
    });
    setAllVideos((prev) =>
      prev.map((v) => (v.id === current.id ? { ...v, isSaved: res.isSaved, savesCount: res.savesCount } : v))
    );
    showToast(res.isSaved ? t(lang, 'saved') : lang === 'bn' ? 'সেভ তালিকা থেকে সরানো হয়েছে' : 'Removed from saved');
  };

  const handleFollow = async () => {
    if (!current) return;
    const res = await apiFetch<{ isFollowing: boolean }>(`/api/v1/users/${current.authorId}/follow`, {
      method: 'POST',
    });
    setAllVideos((prev) =>
      prev.map((v) => (v.authorId === current.authorId ? { ...v, isFollowingAuthor: res.isFollowing } : v))
    );
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !commentText.trim()) return;
    const created = await apiFetch<CommentItem>(`/api/v1/posts/${current.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: commentText.trim(),
        parentCommentId: replyTo?.id,
      }),
    });
    setComments((prev) => [created, ...prev]);
    setAllVideos((prev) =>
      prev.map((v) => (v.id === current.id ? { ...v, commentsCount: v.commentsCount + 1 } : v))
    );
    setCommentText('');
    setReplyTo(null);
  };

  const topLevelComments = useMemo(() => comments.filter((c) => !c.parentCommentId), [comments]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, CommentItem[]>();
    for (const c of comments) {
      if (c.parentCommentId) {
        const list = map.get(c.parentCommentId) ?? [];
        list.push(c);
        map.set(c.parentCommentId, list);
      }
    }
    return map;
  }, [comments]);

  if (loading) {
    return (
      <div className="lg:max-w-md lg:mx-auto lg:py-6 lg:px-4">
        <div className="h-[100dvh] lg:h-auto lg:aspect-[9/16] lg:max-h-[82vh] lg:rounded-3xl bg-[#29243B] animate-pulse mx-auto" />
      </div>
    );
  }

  const title = current ? (lang === 'bn' ? current.titleBn : current.titleEn) : '';
  const caption = current ? (lang === 'bn' ? current.captionBn : current.captionEn) : '';
  const taggedProd = current ? products.find((p) => current.taggedProductIds.includes(p.id)) : undefined;

  return (
    <div className="lg:max-w-6xl lg:mx-auto lg:px-6 lg:py-4 flex flex-col items-center">
      {/* Desktop Feed Switcher (mobile switcher lives cleanly in the transparent top header) */}
      <div className="hidden lg:flex w-full max-w-[400px] items-center justify-center mb-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white border border-[#ECEAF0]">
          {[
            { id: 'for_you' as const, en: 'For You', bn: 'আপনার জন্য' },
            { id: 'following' as const, en: 'Following', bn: 'অনুসরণ' },
            { id: 'trending' as const, en: 'Trending', bn: 'ট্রেন্ডিং' },
          ].map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => switchMode(tabItem.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                mode === tabItem.id ? 'bg-[#29243B] text-white' : 'text-[#777486] hover:text-[#29243B]'
              }`}
            >
              {lang === 'bn' ? tabItem.bn : tabItem.en}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stage Row */}
      <div className="w-full flex flex-col lg:flex-row items-center justify-center lg:gap-6">
        {/* Full-Viewport Edge-to-Edge 9:16 Reels Stage */}
        <div
          onTouchStart={(e) => {
            touchStartY.current = e.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartY.current === null) return;
            const delta = touchStartY.current - (e.changedTouches[0]?.clientY ?? touchStartY.current);
            if (delta > 45) goNext();
            else if (delta < -45) goPrev();
            touchStartY.current = null;
          }}
          onWheel={(e) => {
            if (commentsOpen) return;
            const now = Date.now();
            if (now - lastWheelAtRef.current < 450) return;
            if (e.deltaY > 36) {
              lastWheelAtRef.current = now;
              goNext();
            } else if (e.deltaY < -36) {
              lastWheelAtRef.current = now;
              goPrev();
            }
          }}
          className="relative w-full h-[100dvh] lg:h-auto lg:w-[400px] lg:aspect-[9/16] lg:max-h-[82vh] lg:rounded-3xl overflow-hidden bg-[#29243B] text-white lg:shadow-2xl lg:border lg:border-[#ECEAF0]"
        >
          {/* Background Metadata Preloader for Next Reel */}
          {nextVideoMedia?.videoSrc && (
            <video src={nextVideoMedia.videoSrc} preload="metadata" muted className="hidden" aria-hidden="true" />
          )}

          {/* Empty State if Following feed has 0 videos */}
          {!current ? (
            <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center space-y-3 pt-16">
              <p className="text-sm text-white/85">
                {mode === 'following'
                  ? lang === 'bn'
                    ? 'আপনার অনুসরণ করা ক্রিয়েটরদের কোনো ভিডিও এখনো নেই।'
                    : 'No videos from followed creators yet.'
                  : t(lang, 'emptyFeed')}
              </p>
              <button
                type="button"
                onClick={() => switchMode('for_you')}
                className="px-4 py-2 rounded-xl bg-[#FF6478] text-white text-xs font-semibold"
              >
                {lang === 'bn' ? 'সব ভিডিও দেখুন' : 'Explore For You'}
              </button>
            </div>
          ) : (
            <div
              key={current.id}
              className={`w-full h-full relative ${slideDir === 'next' ? 'animate-reel-up' : 'animate-reel-down'}`}
            >
              {!mediaLoaded && (
                <div className="absolute inset-0 bg-[#29243B] animate-pulse pointer-events-none" />
              )}

              {/* Tap Video Surface to Pause / Play */}
              <button
                type="button"
                onClick={togglePlayTap}
                aria-label={playing ? 'Pause video' : 'Play video'}
                className="w-full h-full block relative focus:outline-none"
              >
                {activeMedia.videoSrc && !videoError ? (
                  <video
                    ref={videoRef}
                    src={activeMedia.videoSrc}
                    poster={activeMedia.posterSrc}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const el = e.currentTarget;
                      if (pendingRestoreTimeRef.current > 0 && Number.isFinite(el.duration)) {
                        el.currentTime = Math.min(pendingRestoreTimeRef.current, Math.max(0, el.duration - 0.5));
                        pendingRestoreTimeRef.current = 0;
                      }
                    }}
                    onLoadedData={() => setMediaLoaded(true)}
                    onCanPlay={() => setMediaLoaded(true)}
                    onTimeUpdate={(e) => {
                      const el = e.currentTarget;
                      if (el.duration > 0) {
                        setProgress(Math.round((el.currentTime / el.duration) * 100));
                      }
                    }}
                    onError={() => {
                      setVideoError(true);
                      setMediaLoaded(true);
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={activeMedia.posterSrc}
                    alt={title}
                    referrerPolicy="no-referrer"
                    onLoad={() => setMediaLoaded(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>

              {/* Centered Tap Feedback Indicator (only appears on tap or while paused) */}
              {(playFeedback || !playing) && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                  <span className="w-14 h-14 rounded-full bg-[#29243B]/60 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-xl">
                    {playing ? <Play className="w-6 h-6 fill-white ml-0.5" /> : <Pause className="w-6 h-6" />}
                  </span>
                </div>
              )}

              {/* Bottom Dark Gradient Scrim for Crisp White Typography */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#29243B]/90 via-[#29243B]/15 to-transparent pointer-events-none" />

              {/* Instagram Reels Right-Side Action Column: ONLY Creator Profile/Follow, Like, Comment, Share, Save */}
              <div className="absolute right-3 bottom-[76px] lg:bottom-6 z-10 flex flex-col items-center gap-4">
                {/* 1. Creator Profile / Follow */}
                <div className="relative flex flex-col items-center mb-1">
                  <Link
                    to={`/creators/${current.authorUsername}`}
                    aria-label={`View creator ${current.authorName}`}
                    className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-[#29243B] block shadow-md"
                  >
                    <img
                      src={current.authorAvatar || '/icon.svg'}
                      alt={current.authorName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={handleFollow}
                    aria-label={current.isFollowingAuthor ? 'Unfollow creator' : 'Follow creator'}
                    className={`-mt-2.5 w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-sm transition-colors ${
                      current.isFollowingAuthor ? 'bg-[#29243B] text-white' : 'bg-[#FF6478] text-white'
                    }`}
                  >
                    {current.isFollowingAuthor ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <Plus className="w-3 h-3 stroke-[3]" />
                    )}
                  </button>
                </div>

                {/* 2. Like */}
                <button
                  type="button"
                  onClick={handleLike}
                  aria-label="Like video"
                  className="flex flex-col items-center gap-0.5 min-w-[44px]"
                >
                  <Heart
                    className={`w-7 h-7 stroke-[1.8] drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] ${
                      popping ? 'animate-heart-pop' : ''
                    } ${current.isLiked ? 'fill-[#FF6478] text-[#FF6478]' : 'text-white'}`}
                  />
                  <span className="text-[11px] font-semibold tabular-nums text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                    {formatCount(current.likesCount, lang)}
                  </span>
                </button>

                {/* 3. Comment */}
                <button
                  type="button"
                  onClick={() => setCommentsOpen(true)}
                  aria-label="View comments"
                  className="flex flex-col items-center gap-0.5 min-w-[44px]"
                >
                  <MessageCircle className="w-7 h-7 stroke-[1.8] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]" />
                  <span className="text-[11px] font-semibold tabular-nums text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                    {formatCount(current.commentsCount, lang)}
                  </span>
                </button>

                {/* 4. Share */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title, url: window.location.href }).catch(() => {});
                    }
                    navigator.clipboard?.writeText(window.location.href).catch(() => {});
                    showToast(lang === 'bn' ? 'ভিডিও লিংক কপি হয়েছে' : 'Video link copied');
                  }}
                  aria-label="Share video"
                  className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px]"
                >
                  <Share2 className="w-7 h-7 stroke-[1.8] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]" />
                </button>

                {/* 5. Save */}
                <button
                  type="button"
                  onClick={handleSave}
                  aria-label="Save video"
                  className="flex flex-col items-center gap-0.5 min-w-[44px]"
                >
                  <Bookmark
                    className={`w-7 h-7 stroke-[1.8] drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] ${
                      current.isSaved ? 'fill-[#FF6478] text-[#FF6478]' : 'text-white'
                    }`}
                  />
                  <span className="text-[11px] font-semibold tabular-nums text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                    {formatCount(current.savesCount, lang)}
                  </span>
                </button>
              </div>

              {/* Bottom-Left Reels Information + Optional Compact Product Tagging Card */}
              <div className="absolute bottom-[70px] lg:bottom-4 left-3.5 right-[72px] z-10 space-y-1.5">
                {/* Creator Avatar + Username + Follow Button */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/creators/${current.authorUsername}`}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <img
                      src={current.authorAvatar || '/icon.svg'}
                      alt={current.authorName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-white/80 shrink-0"
                    />
                    <span className="text-xs sm:text-[13px] font-semibold text-white truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
                      @{current.authorUsername}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleFollow}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold shrink-0 border transition-colors ${
                      current.isFollowingAuthor
                        ? 'bg-white/15 border-white/45 text-white'
                        : 'bg-[#FF6478] border-[#FF6478] text-white hover:bg-[#E83F58]'
                    }`}
                  >
                    {current.isFollowingAuthor ? t(lang, 'following') : t(lang, 'follow')}
                  </button>
                </div>

                {/* Compact Video Caption (tap to expand/collapse) */}
                <button
                  type="button"
                  onClick={() => setCaptionExpanded((v) => !v)}
                  className="block text-left w-full focus:outline-none"
                >
                  <p
                    className={`text-xs text-white/95 leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] ${
                      captionExpanded ? '' : 'line-clamp-2'
                    }`}
                  >
                    {caption || title}
                  </p>
                </button>

                {/* Hashtags */}
                {current.hashtags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    {current.hashtags.slice(0, 3).map((tag) => (
                      <Link
                        key={tag}
                        to={`/search?q=${encodeURIComponent(tag)}`}
                        className="text-[#FFE3D9] font-medium hover:underline drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Audio Information */}
                <p className="text-[11px] text-white/90 flex items-center gap-1.5 truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                  <Music2 className="w-3 h-3 text-white shrink-0" />
                  <span className="truncate">
                    {lang === 'bn'
                      ? `অরিজিনাল অডিও · ${current.authorName}`
                      : `Original Audio · ${current.authorName}`}
                  </span>
                </p>

                {/* Tagged Product Card (Rendered ONLY when a product is tagged) */}
                {taggedProd && (
                  <div className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-[#29243B]/75 backdrop-blur-md border border-white/20 text-white shadow-lg">
                    <Link
                      to={`/products/${taggedProd.id}`}
                      state={{
                        fromVideoId: current.id,
                        fromVideoPath: location.pathname,
                        restoreTime: videoRef.current?.currentTime ?? 0,
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1"
                    >
                      <img
                        src={taggedProd.imageUrl}
                        alt={taggedProd.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/15"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {lang === 'bn' ? taggedProd.titleBn : taggedProd.titleEn}
                        </p>
                        <p className="text-[11px] font-bold text-[#FFE3D9] tabular-nums">
                          {formatBdt(taggedProd.priceBdt, lang)}
                        </p>
                      </div>
                    </Link>
                    <Link
                      to={`/products/${taggedProd.id}`}
                      state={{
                        fromVideoId: current.id,
                        fromVideoPath: location.pathname,
                        restoreTime: videoRef.current?.currentTime ?? 0,
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#FF6478] hover:bg-[#E83F58] text-white text-[11px] font-semibold shrink-0 whitespace-nowrap transition-colors"
                    >
                      {lang === 'bn' ? 'এখনই কিনুন' : 'Shop Now'}
                    </Link>
                  </div>
                )}
              </div>

              {/* Minimal Reels 2px Progress Hairline right above Bottom Navigation */}
              <div
                aria-hidden="true"
                className="absolute bottom-[58px] lg:bottom-0 inset-x-0 z-20 h-[2px] bg-white/20 pointer-events-none"
              >
                <div
                  className="h-full bg-[#FF6478] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Slide-up Comments & Reply Overlay */}
              {commentsOpen && (
                <div className="absolute inset-x-0 bottom-0 h-[68%] bg-white text-[#29243B] rounded-t-3xl p-4 pb-[70px] lg:pb-4 flex flex-col justify-between z-30 animate-sheet-in">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#ECEAF0]">
                    <span className="text-sm font-semibold">
                      {t(lang, 'comments')} ({formatCount(comments.length, lang)})
                    </span>
                    <button
                      type="button"
                      onClick={() => setCommentsOpen(false)}
                      aria-label="Close comments"
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#FAF9F6]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                    {topLevelComments.length === 0 ? (
                      <p className="text-xs text-[#777486] text-center py-6">
                        {lang === 'bn' ? 'প্রথম মন্তব্যটি লিখুন।' : 'Be the first to comment.'}
                      </p>
                    ) : (
                      topLevelComments.map((c) => {
                        const replies = repliesByParent.get(c.id) ?? [];
                        return (
                          <div key={c.id} className="space-y-1.5">
                            <div className="bg-[#FAF9F6] rounded-2xl p-3 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-[#29243B]">{c.authorName}</p>
                                <button
                                  type="button"
                                  onClick={() => setReplyTo(c)}
                                  className="text-[11px] font-semibold text-[#D93B52] hover:underline"
                                >
                                  {lang === 'bn' ? 'উত্তর দিন' : 'Reply'}
                                </button>
                              </div>
                              <p className="text-xs text-[#29243B]/85">{c.content}</p>
                            </div>
                            {replies.length > 0 && (
                              <div className="pl-4 space-y-1.5">
                                {replies.map((r) => (
                                  <div
                                    key={r.id}
                                    className="bg-[#FAF9F6] border border-[#ECEAF0] rounded-xl p-2.5 space-y-0.5"
                                  >
                                    <p className="text-[11px] font-semibold text-[#29243B] flex items-center gap-1">
                                      <CornerDownRight className="w-3 h-3 text-[#777486]" />
                                      <span>{r.authorName}</span>
                                    </p>
                                    <p className="text-xs text-[#29243B]/85 pl-4">{r.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <form onSubmit={handlePostComment} className="space-y-1.5 pt-2 border-t border-[#ECEAF0]">
                    {replyTo && (
                      <div className="flex items-center justify-between text-[11px] text-[#777486] px-1">
                        <span>
                          {lang === 'bn'
                            ? `${replyTo.authorName}-কে উত্তর দিচ্ছেন`
                            : `Replying to ${replyTo.authorName}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          className="text-[#D93B52] font-semibold"
                        >
                          {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={
                          replyTo
                            ? lang === 'bn'
                              ? 'উত্তর লিখুন...'
                              : 'Write a reply...'
                            : lang === 'bn'
                              ? 'মন্তব্য লিখুন...'
                              : 'Add a comment...'
                        }
                        className="flex-1 px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs"
                      />
                      <button
                        type="submit"
                        aria-label="Post comment"
                        className="px-3.5 py-2 rounded-xl bg-[#FF6478] hover:bg-[#E83F58] text-white text-xs font-semibold"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop-only External Up/Down Controls outside the 9:16 video stage */}
        {videos.length > 0 && (
          <div className="hidden lg:flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={goPrev}
              aria-label="Previous video"
              className="w-11 h-11 rounded-2xl bg-white border border-[#ECEAF0] flex items-center justify-center disabled:opacity-35 hover:border-[#B8A5F5] text-[#29243B] transition-colors"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold text-[#777486] tabular-nums">
              {index + 1} / {videos.length}
            </span>
            <button
              type="button"
              disabled={index >= videos.length - 1}
              onClick={goNext}
              aria-label="Next video"
              className="w-11 h-11 rounded-2xl bg-white border border-[#ECEAF0] flex items-center justify-center disabled:opacity-35 hover:border-[#B8A5F5] text-[#29243B] transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
