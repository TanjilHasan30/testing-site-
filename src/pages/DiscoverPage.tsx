import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby, BookOpen, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORY_LABELS, t } from '../i18n/translations';
import { PostCard, type EnrichedPost } from '../components/PostCard';
import { PostDetailModal } from '../components/PostDetailModal';
import type { FeedTab, UserProfile } from '../types/platform';

const CATEGORIES = [
  'all',
  'pregnancy',
  'motherhood',
  'newborn',
  'baby_care',
  'parenting',
  'baby_food',
  'nutrition',
  'baby_development',
  'mother_wellness',
  'doctor_advice',
  'product_reviews',
];

export const DiscoverPage: React.FC<{ initialTab?: FeedTab }> = ({ initialTab = 'discover' }) => {
  const { lang, apiFetch, showToast } = useApp();
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const [category, setCategory] = useState('all');
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [creators, setCreators] = useState<(UserProfile & { isFollowing?: boolean })[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<EnrichedPost | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    apiFetch<(UserProfile & { isFollowing?: boolean })[]>('/api/v1/creators')
      .then(setCreators)
      .catch(() => setCreators([]));
  }, [apiFetch]);

  const loadFeed = useCallback(
    async (cursor = 0, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await apiFetch<{ items: EnrichedPost[]; nextCursor: number | null }>(
          `/api/v1/feed?tab=${tab}&category=${category}&lang=${lang}&cursor=${cursor}&limit=12`
        );
        setPosts((prev) => (append ? [...prev, ...res.items] : res.items));
        setNextCursor(res.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load discovery feed');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [apiFetch, tab, category, lang]
  );

  useEffect(() => {
    loadFeed(0, false);
  }, [loadFeed]);

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await apiFetch<{ isLiked: boolean; likesCount: number }>(`/api/v1/posts/${postId}/like`, {
        method: 'POST',
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount } : p))
      );
      setSelectedPost((prev) =>
        prev && prev.id === postId ? { ...prev, isLiked: res.isLiked, likesCount: res.likesCount } : prev
      );
    } catch {
      showToast('Could not update like');
    }
  };

  const handleToggleSave = async (postId: string) => {
    try {
      const res = await apiFetch<{ isSaved: boolean; savesCount: number }>(`/api/v1/posts/${postId}/save`, {
        method: 'POST',
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: res.isSaved, savesCount: res.savesCount } : p))
      );
      setSelectedPost((prev) =>
        prev && prev.id === postId ? { ...prev, isSaved: res.isSaved, savesCount: res.savesCount } : prev
      );
      showToast(res.isSaved ? t(lang, 'saved') : 'Removed from saved');
    } catch {
      showToast('Could not update saved state');
    }
  };

  const handleFollow = async (authorId: string) => {
    try {
      const res = await apiFetch<{ isFollowing: boolean }>(`/api/v1/users/${authorId}/follow`, {
        method: 'POST',
      });
      setPosts((prev) =>
        prev.map((p) => (p.authorId === authorId ? { ...p, isFollowingAuthor: res.isFollowing } : p))
      );
      setSelectedPost((prev) =>
        prev && prev.authorId === authorId ? { ...prev, isFollowingAuthor: res.isFollowing } : prev
      );
    } catch {
      showToast('Could not update follow');
    }
  };

  const handleBlock = async (authorId: string) => {
    try {
      await apiFetch(`/api/v1/users/${authorId}/block`, { method: 'POST' });
      setPosts((prev) => prev.filter((p) => p.authorId !== authorId));
      showToast(lang === 'bn' ? 'ব্যবহারকারীকে ব্লক করা হয়েছে' : 'Creator blocked from your feed');
    } catch {
      showToast('Could not block user');
    }
  };

  const tabs: { id: FeedTab; label: string }[] = [
    { id: 'discover', label: t(lang, 'tabDiscover') },
    { id: 'following', label: t(lang, 'tabFollowing') },
    { id: 'videos', label: t(lang, 'tabVideos') },
    { id: 'trending', label: t(lang, 'tabTrending') },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-8 pt-4 md:pt-6 space-y-5">
      {/* Compact Editorial Welcome Strip — Content First */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold text-[#29243B] tracking-tight">
            {lang === 'bn' ? 'আপনার মাতৃত্বের পৃথিবীতে স্বাগতম।' : 'Welcome to your motherhood world.'}
          </h1>
          <p className="text-sm text-[#777486]">
            {lang === 'bn'
              ? 'চারপাশের মায়েদের গল্প, অভিজ্ঞতা ও অনুপ্রেরণা আবিষ্কার করুন।'
              : 'Discover stories, experiences and inspiration from mothers around you.'}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
          <Link
            to="/guide"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#ECEAF0] text-[#29243B] hover:border-[#B8A5F5] transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#D93B52]" />
            <span>{t(lang, 'navGuide')}</span>
          </Link>
          <Link
            to="/baby-tracker"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EFF8F3] border border-[#B8DCCB] text-[#1E5A40] hover:bg-[#B8DCCB]/40 transition-colors whitespace-nowrap"
          >
            <Baby className="w-3.5 h-3.5" />
            <span>{t(lang, 'navTracker')}</span>
          </Link>
        </div>
      </section>

      {/* A. Story / Creator Strip */}
      {creators.length > 0 && (
        <section aria-label="Featured creators and doctors" className="flex items-center gap-3.5 overflow-x-auto no-scrollbar pb-1">
          {creators.map((creator) => {
            const isDoc = creator.roles.includes('doctor');
            const ringClass = isDoc
              ? 'ring-[#B8DCCB] bg-[#EFF8F3]'
              : creator.isFollowing
                ? 'ring-[#B8A5F5] bg-[#F3F0FE]'
                : 'ring-[#FF6478] bg-[#FFE3D9]';
            return (
              <Link
                key={creator.uid}
                to={`/creators/${creator.username}`}
                className="flex flex-col items-center gap-1.5 w-20 shrink-0 group text-center"
              >
                <div className={`relative w-14 h-14 rounded-full p-0.5 ring-2 ${ringClass} transition-transform duration-200 group-hover:scale-105`}>
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover bg-white"
                  />
                  {isDoc && (
                    <span
                      title={t(lang, 'verifiedDoctor')}
                      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#B8DCCB] border-2 border-white flex items-center justify-center text-[#1E5A40]"
                    >
                      <ShieldCheck className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-[#29243B] truncate w-full">
                  {(() => {
                    const parts = creator.displayName.split(' ');
                    return parts[0] === 'ডা.' || parts[0] === 'Dr.'
                      ? `${parts[0]} ${parts[1] || ''}`.trim()
                      : parts[0];
                  })()}
                </span>
                <span className="text-[10px] text-[#777486] truncate w-full -mt-1">
                  {creator.creatorCategory || (isDoc ? 'Doctor' : 'Mother')}
                </span>
              </Link>
            );
          })}
        </section>
      )}

      {/* B. Discovery Navigation + C. Category Navigation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 border-b border-[#ECEAF0] pb-2.5">
          <div role="tablist" aria-label="Feed tabs" className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {tabs.map((item) => (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[40px] ${
                  tab === item.id
                    ? 'bg-[#29243B] text-white'
                    : 'text-[#777486] hover:bg-white hover:text-[#29243B]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Link
            to="/community"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#D93B52] hover:underline whitespace-nowrap shrink-0"
          >
            {t(lang, 'askQuestion')} →
          </Link>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors min-h-[36px] ${
                category === cat
                  ? 'bg-[#B8A5F5]/30 text-[#29243B] font-semibold border border-[#B8A5F5]'
                  : 'bg-white text-[#777486] border border-[#ECEAF0] hover:border-[#B8A5F5] hover:text-[#29243B]'
              }`}
            >
              {CATEGORY_LABELS[cat]?.[lang] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* D. Asymmetric Masonry Discovery Feed */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" aria-label="Loading posts">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-3 border border-[#ECEAF0] animate-pulse space-y-3">
              <div className="aspect-[3/4] rounded-xl bg-[#FFE3D9]/50" />
              <div className="h-3 bg-[#ECEAF0] rounded w-3/4" />
              <div className="h-3 bg-[#ECEAF0] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-[#ECEAF0] space-y-3">
          <p className="text-sm text-[#777486]">{error}</p>
          <button
            type="button"
            onClick={() => loadFeed(0, false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#29243B] text-white text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t(lang, 'retry')}
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-[#ECEAF0] space-y-3">
          <p className="text-sm text-[#777486]">{t(lang, 'emptyFeed')}</p>
          <button
            type="button"
            onClick={() => {
              setTab('discover');
              setCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-[#FFE3D9] text-[#29243B] text-xs font-semibold"
          >
            {lang === 'bn' ? 'সব পোস্ট দেখুন' : 'View All Stories'}
          </button>
        </div>
      ) : (
        <>
          <div
            data-testid="masonry-feed"
            className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4"
          >
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onOpen={setSelectedPost}
                onToggleLike={handleToggleLike}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>

          {nextCursor !== null && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => loadFeed(nextCursor, true)}
                className="px-6 py-2.5 rounded-xl bg-white border border-[#ECEAF0] text-sm font-semibold text-[#29243B] hover:border-[#B8A5F5] transition-colors"
              >
                {loadingMore
                  ? t(lang, 'loading')
                  : lang === 'bn'
                    ? 'আরও গল্প দেখুন'
                    : 'Load More Stories'}
              </button>
            </div>
          )}
        </>
      )}

      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onLike={handleToggleLike}
        onSave={handleToggleSave}
        onFollow={handleFollow}
        onBlock={handleBlock}
      />
    </div>
  );
};
