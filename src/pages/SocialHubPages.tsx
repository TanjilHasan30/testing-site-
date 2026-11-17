import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  CheckCheck,
  Film,
  Grid,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { PostCard, type EnrichedPost } from '../components/PostCard';
import { PostDetailModal } from '../components/PostDetailModal';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { formatBdt, formatCount, resolveVideoMedia } from '../lib/domain';
import type {
  ConversationItem,
  DoctorProfile,
  GuideArticle,
  PostItem,
  ProductItem,
  QuestionItem,
  UserProfile,
} from '../types/platform';

export const MessagesPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    apiFetch<ConversationItem[]>('/api/v1/messages').then((list) => {
      setConversations(list);
      if (list[0]) setActiveId(list[0].id);
    });
  }, [apiFetch]);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    try {
      const msg = await apiFetch<ConversationItem['messages'][number]>('/api/v1/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId: active.id, text: draft }),
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === active.id ? { ...c, lastMessage: msg.text, messages: [...c.messages, msg] } : c
        )
      );
      setDraft('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Message failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#29243B]">{t(lang, 'messages')}</h1>
          <p className="text-xs text-[#777486] mt-0.5">
            {lang === 'bn' ? 'মা, ক্রিয়েটর এবং চিকিৎসকদের সাথে ব্যক্তিগত বার্তা' : 'Private conversations with mothers, creators & clinicians'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#ECEAF0] shadow-[0_6px_24px_rgba(41,36,59,0.05)] grid grid-cols-1 md:grid-cols-12 min-h-[480px] overflow-hidden">
        <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#ECEAF0] p-3 space-y-1.5 bg-[#FAF9F6]/60">
          {conversations.map((c) => {
            const isSelected = active?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors ${
                  isSelected
                    ? 'bg-[#F3F0FE] border border-[#B8A5F5]/60'
                    : 'hover:bg-white border border-transparent'
                }`}
              >
                <img
                  src={c.participantAvatar}
                  alt={c.participantName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#29243B] truncate">{c.participantName}</p>
                  <p className="text-[11px] text-[#777486] truncate mt-0.5">{c.lastMessage}</p>
                </div>
              </button>
            );
          })}
        </aside>

        <div className="md:col-span-8 flex flex-col justify-between bg-[#FAF9F6]">
          {active ? (
            <>
              <div className="p-4 bg-white border-b border-[#ECEAF0] flex items-center gap-3">
                <img
                  src={active.participantAvatar}
                  alt={active.participantName}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <span className="text-sm font-semibold text-[#29243B] block leading-tight">
                    {active.participantName}
                  </span>
                  <span className="text-[11px] text-[#777486]">
                    {lang === 'bn' ? 'প্রাইভেট চ্যাট' : 'Direct Message'}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-5 space-y-3 overflow-y-auto">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl p-3.5 border border-[#ECEAF0] max-w-md space-y-1 shadow-[0_2px_8px_rgba(41,36,59,0.03)]"
                  >
                    <p className="text-[11px] font-semibold text-[#E83F58]">{m.senderName}</p>
                    <p className="text-sm text-[#29243B] leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSend} className="p-3.5 bg-white border-t border-[#ECEAF0] flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={lang === 'bn' ? 'বার্তা লিখুন...' : 'Type a private message...'}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] placeholder:text-[#777486] focus:outline-none focus:border-[#B8A5F5]"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="px-4 py-2.5 rounded-2xl bg-[#E83F58] hover:bg-[#D93B52] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{lang === 'bn' ? 'পাঠান' : 'Send'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-[#777486]">No conversations yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export const NotificationsPage: React.FC = () => {
  const { lang, notifications, markAllNotificationsRead } = useApp();

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-semibold text-[#29243B] flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-2xl bg-[#FFE3D9] flex items-center justify-center">
            <Bell className="w-4 h-4 text-[#E83F58]" />
          </span>
          {t(lang, 'notifications')}
        </h1>
        <button
          type="button"
          onClick={markAllNotificationsRead}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-semibold text-[#29243B] transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5 text-[#1E5A40]" />
          {lang === 'bn' ? 'সবগুলো পঠিত চিহ্নিত করুন' : 'Mark all read'}
        </button>
      </div>

      <div className="bg-white rounded-3xl divide-y divide-[#ECEAF0] border border-[#ECEAF0] overflow-hidden shadow-[0_6px_24px_rgba(41,36,59,0.04)]">
        {notifications.map((n) => (
          <Link
            key={n.id}
            to={n.link}
            className={`block p-4 sm:p-5 transition-colors hover:bg-[#FAF9F6] ${
              !n.isRead ? 'bg-[#F3F0FE]/45' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#29243B]">
                  {lang === 'bn' ? n.titleBn : n.titleEn}
                </p>
                <p className="text-xs text-[#777486] mt-1 leading-relaxed">
                  {lang === 'bn' ? n.bodyBn : n.bodyEn}
                </p>
              </div>
              {!n.isRead && (
                <span className="text-[11px] font-semibold text-[#E83F58] shrink-0">
                  {lang === 'bn' ? 'নতুন' : 'New'}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export const SearchPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { lang, apiFetch } = useApp();
  const initialQ = params.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<{
    trending: string[];
    posts: PostItem[];
    products: ProductItem[];
    doctors: DoctorProfile[];
    guides: GuideArticle[];
    questions: QuestionItem[];
    creators: UserProfile[];
  } | null>(null);

  useEffect(() => {
    apiFetch<NonNullable<typeof results>>(`/api/v1/search?q=${encodeURIComponent(q)}`)
      .then(setResults)
      .catch(() => {});
  }, [q, apiFetch]);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="relative">
        <Search className="w-4 h-4 text-[#777486] absolute left-4 top-4" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setParams(e.target.value ? { q: e.target.value } : {});
          }}
          placeholder={t(lang, 'searchPlaceholder')}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-[#ECEAF0] text-sm text-[#29243B] placeholder:text-[#777486] focus:outline-none focus:border-[#B8A5F5] shadow-[0_4px_16px_rgba(41,36,59,0.04)]"
        />
      </div>

      {results && !q.trim() && (
        <div className="bg-white rounded-3xl p-5 border border-[#ECEAF0] space-y-3">
          <p className="text-xs font-semibold text-[#777486] uppercase tracking-wide">
            {lang === 'bn' ? 'জনপ্রিয় অনুসন্ধান' : 'Trending Searches'}
          </p>
          <div className="flex flex-wrap gap-2">
            {results.trending.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQ(term)}
                className="px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs font-semibold text-[#29243B] hover:border-[#B8A5F5] hover:bg-[#F3F0FE]/60 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {results && q.trim() && (
        <div className="space-y-6">
          <p className="text-xs font-medium text-[#777486]">
            Results for “{q}”: {results.posts.length} stories · {results.products.length} products ·{' '}
            {results.doctors.length} doctors · {results.guides.length} guides
          </p>

          {results.posts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-display font-semibold text-[#29243B]">Stories &amp; Videos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.posts.map((p) => {
                  const thumb = p.isVideo ? resolveVideoMedia(p.mediaUrls).posterSrc : p.mediaUrls[0];
                  return (
                    <Link
                      key={p.id}
                      to={p.isVideo ? `/videos?v=${p.id}` : '/discover'}
                      className="bg-white rounded-2xl p-3 border border-[#ECEAF0] hover:border-[#B8A5F5] flex gap-3 transition-colors"
                    >
                      <img
                        src={thumb}
                        alt={p.titleEn}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 bg-[#FAF9F6]"
                      />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#29243B] line-clamp-2">
                        {lang === 'bn' ? p.titleBn : p.titleEn}
                      </p>
                      <p className="text-xs text-[#777486] mt-0.5">{p.authorName}</p>
                    </div>
                  </Link>
                  );
                })}
              </div>
            </section>
          )}

          {results.products.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-display font-semibold text-[#29243B]">Marketplace Products</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.products.map((p) => (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}`}
                    className="bg-white rounded-2xl p-3 border border-[#ECEAF0] hover:border-[#B8A5F5] flex gap-3 transition-colors"
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.titleEn}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 bg-[#FAF9F6]"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#29243B] line-clamp-2">
                        {lang === 'bn' ? p.titleBn : p.titleEn}
                      </p>
                      <p className="text-xs font-bold text-[#E83F58] tabular-nums mt-0.5">
                        {formatBdt(p.priceBdt, lang)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.doctors.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-display font-semibold text-[#29243B]">Doctors</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.doctors.map((d) => (
                  <Link
                    key={d.id}
                    to={`/doctors/${d.id}`}
                    className="block bg-[#EFF8F3] rounded-2xl p-4 border border-[#B8DCCB] hover:border-[#1E5A40]/40 transition-colors"
                  >
                    <p className="text-sm font-semibold text-[#29243B]">
                      {lang === 'bn' ? d.nameBn : d.nameEn}
                    </p>
                    <p className="text-xs text-[#1E5A40] mt-0.5">{d.specialisation}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export const CreatorsAndProfilePage: React.FC<{ mode?: 'directory' | 'profile' | 'saved' }> = ({
  mode = 'profile',
}) => {
  const { username } = useParams();
  const { lang, viewerId, apiFetch, addToCart, showToast } = useApp();
  const [creators, setCreators] = useState<(UserProfile & { isFollowing?: boolean })[]>([]);
  const [profileData, setProfileData] = useState<{
    user: UserProfile & { isFollowing?: boolean };
    posts: EnrichedPost[];
  } | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [activeTab, setActiveTab] = useState<'stories' | 'videos' | 'collections'>('stories');
  const [selectedPost, setSelectedPost] = useState<EnrichedPost | null>(null);

  useEffect(() => {
    if (mode === 'directory') {
      apiFetch<(UserProfile & { isFollowing?: boolean })[]>('/api/v1/creators').then(setCreators);
    } else {
      const target = username || viewerId;
      apiFetch<{ user: UserProfile & { isFollowing?: boolean }; posts: EnrichedPost[] }>(
        `/api/v1/creators/${target}`
      )
        .then((data) => {
          setProfileData(data);
          const hasStories = data.posts.some((p) => !p.isVideo && p.type !== 'short_video' && p.type !== 'long_video');
          const hasVideos = data.posts.some((p) => p.isVideo || p.type === 'short_video' || p.type === 'long_video');
          if (!hasStories && hasVideos) {
            setActiveTab('videos');
          } else if (!hasStories && !hasVideos) {
            setActiveTab('collections');
          } else {
            setActiveTab('stories');
          }
        })
        .catch(() => {
          apiFetch<{ user: UserProfile & { isFollowing?: boolean }; posts: EnrichedPost[] }>(
            '/api/v1/creators/ayesha_mom'
          )
            .then(setProfileData)
            .catch(() => {});
        });
      apiFetch<{ products: ProductItem[] }>('/api/v1/products')
        .then((res) => setProducts(Array.isArray(res?.products) ? res.products : []))
        .catch(() => {});
    }
  }, [mode, username, viewerId, apiFetch]);

  const handleFollow = async (targetUid: string) => {
    const res = await apiFetch<{ isFollowing: boolean; followersCount: number }>(
      `/api/v1/users/${targetUid}/follow`,
      { method: 'POST' }
    );
    setCreators((prev) =>
      prev.map((c) =>
        c.uid === targetUid ? { ...c, isFollowing: res.isFollowing, followersCount: res.followersCount } : c
      )
    );
    setProfileData((prev) =>
      prev && prev.user.uid === targetUid
        ? { ...prev, user: { ...prev.user, isFollowing: res.isFollowing, followersCount: res.followersCount } }
        : prev
    );
    showToast(res.isFollowing ? t(lang, 'following') : 'Unfollowed');
  };

  const handleLikePost = async (postId: string) => {
    const res = await apiFetch<{ isLiked: boolean; likesCount: number }>(`/api/v1/posts/${postId}/like`, {
      method: 'POST',
    });
    setProfileData((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((p) =>
              p.id === postId ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount } : p
            ),
          }
        : prev
    );
    setSelectedPost((prev) =>
      prev && prev.id === postId ? { ...prev, isLiked: res.isLiked, likesCount: res.likesCount } : prev
    );
  };

  const handleSavePost = async (postId: string) => {
    const res = await apiFetch<{ isSaved: boolean; savesCount: number }>(`/api/v1/posts/${postId}/save`, {
      method: 'POST',
    });
    setProfileData((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((p) =>
              p.id === postId ? { ...p, isSaved: res.isSaved, savesCount: res.savesCount } : p
            ),
          }
        : prev
    );
    setSelectedPost((prev) =>
      prev && prev.id === postId ? { ...prev, isSaved: res.isSaved, savesCount: res.savesCount } : prev
    );
    showToast(res.isSaved ? (lang === 'bn' ? 'সংরক্ষিত হয়েছে' : 'Saved to collections') : 'Removed from saved');
  };

  if (mode === 'directory') {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-[#29243B]">
              {lang === 'bn' ? 'মা ও প্যারেন্টিং ক্রিয়েটর নেটওয়ার্ক' : 'Mother & Parenting Creator Network'}
            </h1>
            <p className="text-sm text-[#777486] mt-1">
              {lang === 'bn'
                ? 'বাংলাদেশের যাচাইকৃত চিকিৎসক, মা এবং অভিজ্ঞ ক্রিয়েটরদের সাথে যুক্ত হোন।'
                : 'Follow verified mothers, paediatric experts, and trusted storytellers.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {creators.map((c) => {
            const isDoc = c.roles.includes('doctor');
            return (
              <div
                key={c.uid}
                className="bg-white rounded-3xl p-5 border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)] flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3.5">
                    <Link to={`/creators/${c.username}`} className="shrink-0">
                      <img
                        src={c.avatarUrl}
                        alt={c.displayName}
                        className={`w-14 h-14 rounded-2xl object-cover ring-2 ${
                          isDoc ? 'ring-[#B8DCCB]' : 'ring-[#FFE3D9]'
                        }`}
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to={`/creators/${c.username}`}
                        className="text-sm font-semibold text-[#29243B] hover:text-[#E83F58] truncate flex items-center gap-1"
                      >
                        <span className="truncate">{c.displayName}</span>
                        {(isDoc || c.roles.includes('creator')) && (
                          <ShieldCheck
                            className={`w-4 h-4 shrink-0 ${isDoc ? 'text-[#1E5A40]' : 'text-[#845EF7]'}`}
                          />
                        )}
                      </Link>
                      <p className="text-xs text-[#777486] truncate">
                        @{c.username} · {c.creatorCategory || (isDoc ? 'Paediatric Specialist' : 'Motherhood Creator')}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[#29243B]/80 line-clamp-2 leading-relaxed">{c.bio}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#ECEAF0] text-xs">
                  <span className="tabular-nums font-semibold text-[#777486]">
                    {formatCount(c.followersCount, lang)} {lang === 'bn' ? 'ফলোয়ার' : 'followers'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFollow(c.uid)}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors ${
                      c.isFollowing
                        ? 'bg-[#F3F0FE] text-[#29243B] border border-[#B8A5F5]'
                        : 'bg-[#29243B] text-white hover:bg-[#E83F58]'
                    }`}
                  >
                    {c.isFollowing ? t(lang, 'following') : t(lang, 'follow')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!profileData) return <div className="p-10 text-center text-sm text-[#777486]">{t(lang, 'loading')}</div>;

  const { user, posts: rawPosts } = profileData;
  const posts = Array.isArray(rawPosts) ? rawPosts : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const isDoctor = Array.isArray(user.roles) && user.roles.includes('doctor');
  const isVerifiedBadge = isDoctor || (Array.isArray(user.roles) && user.roles.includes('creator'));
  const storyPosts = posts.filter((p) => !p.isVideo && p.type !== 'short_video' && p.type !== 'long_video');
  const videoPosts = posts.filter((p) => p.isVideo || p.type === 'short_video' || p.type === 'long_video');

  // Curated product collection: tagged products in creator's posts + featured catalog items
  const taggedProductIds = Array.from(
    new Set(posts.flatMap((p) => (Array.isArray(p.taggedProductIds) ? p.taggedProductIds : [])))
  );
  const collectionProducts =
    taggedProductIds.length > 0
      ? safeProducts.filter((prod) => taggedProductIds.includes(prod.id))
      : safeProducts.slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Premium Cover + Portrait Identity Card */}
      <section className="bg-white rounded-3xl overflow-hidden border border-[#ECEAF0] shadow-[0_8px_28px_rgba(41,36,59,0.05)]">
        <div className="h-44 sm:h-56 bg-[#F3F0FE] relative overflow-hidden">
          {user.coverUrl ? (
            <img src={user.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#FFE3D9] via-[#FAF9F6] to-[#F3F0FE]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#29243B]/35 via-transparent to-transparent" />
        </div>

        <div className="px-5 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 relative z-10">
            <div className="flex items-end gap-4">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-white bg-[#FAF9F6] shadow-md shrink-0"
              />
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-display font-semibold text-[#29243B]">
                    {user.displayName}
                  </h1>
                  {isVerifiedBadge && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${
                        isDoctor
                          ? 'bg-[#EFF8F3] text-[#1E5A40] border border-[#B8DCCB]'
                          : 'bg-[#F3F0FE] text-[#29243B] border border-[#B8A5F5]/60'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isDoctor
                        ? lang === 'bn'
                          ? 'যাচাইকৃত চিকিৎসক'
                          : 'Verified Doctor'
                        : lang === 'bn'
                          ? 'যাচাইকৃত ক্রিয়েটর'
                          : 'Verified Creator'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#777486] mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>@{user.username}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {user.location || 'Bangladesh'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleFollow(user.uid)}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${
                  user.isFollowing
                    ? 'bg-[#F3F0FE] text-[#29243B] border border-[#B8A5F5]'
                    : 'bg-[#E83F58] hover:bg-[#D93B52] text-white'
                }`}
              >
                {user.isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {user.isFollowing ? t(lang, 'following') : t(lang, 'follow')}
              </button>
              <Link
                to="/messages"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-semibold text-[#29243B] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#777486]" />
                {t(lang, 'messages')}
              </Link>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <p className="text-sm text-[#29243B]/85 leading-relaxed max-w-3xl">{user.bio}</p>

            <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[#ECEAF0]">
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-base font-bold text-[#29243B]">{formatCount(user.followersCount, lang)}</span>
                <span className="text-xs text-[#777486]">{lang === 'bn' ? 'ফলোয়ার' : 'Followers'}</span>
              </div>
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-base font-bold text-[#29243B]">{formatCount(user.followingCount, lang)}</span>
                <span className="text-xs text-[#777486]">{lang === 'bn' ? 'অনুসরণ' : 'Following'}</span>
              </div>
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-base font-bold text-[#E83F58]">{formatCount(user.likesCount, lang)}</span>
                <span className="text-xs text-[#777486]">{lang === 'bn' ? 'লাইক' : 'Likes'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Profile Content Tabs: Photos & Stories | Videos | Product Collections */}
      <div className="flex items-center gap-2 border-b border-[#ECEAF0] pb-3 overflow-x-auto no-scrollbar" role="tablist">
        {[
          {
            id: 'stories' as const,
            label: lang === 'bn' ? `ছবি ও গল্প (${storyPosts.length})` : `Photos & Stories (${storyPosts.length})`,
            icon: Grid,
          },
          {
            id: 'videos' as const,
            label: lang === 'bn' ? `ভিডিও (${videoPosts.length})` : `Videos (${videoPosts.length})`,
            icon: Film,
          },
          {
            id: 'collections' as const,
            label:
              lang === 'bn'
                ? `প্রোডাক্ট কালেকশন (${collectionProducts.length})`
                : `Product Collections (${collectionProducts.length})`,
            icon: ShoppingBag,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-[#29243B] text-white'
                  : 'bg-white border border-[#ECEAF0] text-[#777486] hover:text-[#29243B] hover:border-[#B8A5F5]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'stories' && (
        storyPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#ECEAF0] space-y-2">
            <p className="text-sm font-medium text-[#777486]">
              {lang === 'bn' ? 'এখনো কোনো ছবি বা গল্প প্রকাশিত হয়নি।' : 'No photos or stories published yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {storyPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onOpen={setSelectedPost}
                onToggleLike={handleLikePost}
                onToggleSave={handleSavePost}
              />
            ))}
          </div>
        )
      )}

      {activeTab === 'videos' && (
        videoPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#ECEAF0] space-y-2">
            <p className="text-sm font-medium text-[#777486]">
              {lang === 'bn' ? 'কোনো শর্ট ভিডিও পাওয়া যায়নি।' : 'No short videos shared yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {videoPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onOpen={setSelectedPost}
                onToggleLike={handleLikePost}
                onToggleSave={handleSavePost}
              />
            ))}
          </div>
        )
      )}

      {activeTab === 'collections' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {collectionProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#ECEAF0] shadow-[0_4px_16px_rgba(41,36,59,0.04)] flex flex-col justify-between"
            >
              <Link to={`/products/${prod.id}`} className="block group overflow-hidden">
                <img
                  src={prod.imageUrl}
                  alt={prod.titleEn}
                  className="w-full aspect-[4/3] object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </Link>
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#777486]">
                  <span className="truncate">{prod.shopName}</span>
                  <span className="text-[#1E5A40] font-semibold shrink-0">★ {prod.rating.toFixed(1)}</span>
                </div>
                <Link
                  to={`/products/${prod.id}`}
                  className="block text-sm font-semibold text-[#29243B] line-clamp-2 hover:text-[#E83F58]"
                >
                  {lang === 'bn' ? prod.titleBn : prod.titleEn}
                </Link>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-[#29243B] tabular-nums">
                    {formatBdt(prod.priceBdt, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      addToCart({
                        productId: prod.id,
                        variant: prod.variants[0] || 'Standard',
                        quantity: 1,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
                  >
                    {t(lang, 'addToCart')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onLike={handleLikePost}
        onSave={handleSavePost}
        onFollow={handleFollow}
        onBlock={() => setSelectedPost(null)}
      />
    </div>
  );
};

export const InfoPage: React.FC<{ page: 'about' | 'help' | 'privacy' | 'terms' | 'guidelines' | 'contact' }> = ({
  page,
}) => {
  const titles: Record<typeof page, { title: string; body: string }> = {
    about: {
      title: 'About Aloorai',
      body: 'Aloorai is a modern social discovery, motherhood Q&A, paediatric consultation, baby growth tracking, and social commerce platform designed in Bengali and English.',
    },
    help: {
      title: 'Help & Support Center',
      body: 'Need assistance with orders, appointment bookings, or privacy controls? Reach our Dhaka support team or review our emergency medical guidance on Doctor Corner.',
    },
    privacy: {
      title: 'Privacy Policy & Child Safety',
      body: 'Children’s photos, growth logs, pregnancy notes, and private messages are protected with explicit owner-only access controls and can be deleted at any time from your Baby Tracker or Profile.',
    },
    terms: {
      title: 'Terms of Service',
      body: 'Educational guides and community discussions support family care and never replace licensed clinical diagnosis. COD marketplace orders remain unpaid until delivery collection is confirmed.',
    },
    guidelines: {
      title: 'Community Guidelines',
      body: 'We foster warm, respectful motherhood support. Dangerous medical claims, child privacy violations, harassment, and counterfeit products are removed via human moderation review.',
    },
    contact: {
      title: 'Contact Aloorai Bangladesh',
      body: 'Headquarters: Dhanmondi, Dhaka 1205, Bangladesh. Support email: support@aloorai.example.bd',
    },
  };

  const info = titles[page];
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
      <div className="bg-white rounded-3xl p-8 border border-[#ECEAF0] shadow-[0_6px_24px_rgba(41,36,59,0.04)] space-y-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#845EF7] bg-[#F3F0FE] px-3 py-1 rounded-xl">
          <Sparkles className="w-3.5 h-3.5" />
          Aloorai Platform
        </span>
        <h1 className="text-2xl font-display font-semibold text-[#29243B]">{info.title}</h1>
        <p className="text-sm text-[#777486] leading-relaxed">{info.body}</p>
      </div>
    </div>
  );
};

export const AuthPage: React.FC<{ mode?: 'login' | 'register' | 'verify' | 'reset' }> = ({ mode = 'login' }) => {
  const { lang, firebaseUser, signInWithGoogle, signOutUser } = useApp();
  const headings: Record<string, { en: string; bn: string }> = {
    login: { en: 'Sign in to Aloorai', bn: 'Aloorai-এ সাইন ইন করুন' },
    register: { en: 'Create your Aloorai Account', bn: 'নতুন অ্যাকাউন্ট তৈরি করুন' },
    verify: { en: 'Account Verification', bn: 'অ্যাকাউন্ট যাচাইকরণ' },
    reset: { en: 'Account Recovery', bn: 'অ্যাকাউন্ট পুনরুদ্ধার' },
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl p-8 border border-[#ECEAF0] shadow-[0_12px_36px_rgba(41,36,59,0.06)] space-y-5">
        <div className="w-11 h-11 rounded-2xl bg-[#FFE3D9] flex items-center justify-center">
          <Lock className="w-5 h-5 text-[#E83F58]" />
        </div>
        <h1 className="text-2xl font-display font-semibold text-[#29243B]">{headings[mode][lang]}</h1>
        <p className="text-sm text-[#777486] leading-relaxed">
          {lang === 'bn'
            ? 'নিরাপদ প্রবেশাধিকারের জন্য Google সাইন-ইন ব্যবহার করুন অথবা ডেমো অতিথি মোডে সরাসরি প্ল্যাটফর্ম ব্যবহার করুন।'
            : 'Sign in with Google via Firebase Authentication to sync your private profile, or continue exploring immediately in the interactive Demo Mother session.'}
        </p>
        {firebaseUser ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm">
              <p className="font-semibold text-[#29243B]">{firebaseUser.displayName || 'Signed-in Member'}</p>
              <p className="text-xs text-[#777486] mt-0.5">{firebaseUser.email}</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/profile"
                className="flex-1 py-2.5 rounded-2xl bg-[#29243B] text-white text-xs font-semibold text-center hover:bg-[#E83F58] transition-colors"
              >
                {t(lang, 'profile')}
              </Link>
              <button
                type="button"
                onClick={signOutUser}
                className="px-4 py-2.5 rounded-2xl border border-[#ECEAF0] text-xs font-semibold text-[#29243B] hover:border-[#E83F58]"
              >
                {t(lang, 'logout')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full py-3 rounded-2xl bg-[#E83F58] hover:bg-[#D93B52] text-white text-sm font-semibold transition-colors"
            >
              {lang === 'bn' ? 'Google দিয়ে এগিয়ে যান' : 'Continue with Google'}
            </button>
            <Link
              to="/"
              className="block w-full py-2.5 rounded-2xl border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-semibold text-center text-[#29243B] transition-colors"
            >
              {lang === 'bn' ? 'অতিথি ডেমো হিসেবে চালিয়ে যান' : 'Continue in Guest Demo Session'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export const WishlistPage: React.FC = () => {
  const { lang, wishlistIds, toggleWishlist, addToCart, apiFetch } = useApp();
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    apiFetch<{ products: ProductItem[] }>('/api/v1/products')
      .then((res) => setProducts(Array.isArray(res?.products) ? res.products : []))
      .catch(() => {});
  }, [apiFetch]);

  const savedProducts = (Array.isArray(products) ? products : []).filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-[#29243B] flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#FF6478] fill-[#FF6478]" />
          {lang === 'bn' ? 'পছন্দের তালিকা (উইশলিস্ট)' : 'Saved Marketplace Wishlist'}
        </h1>
        <Link to="/marketplace" className="text-xs font-semibold text-[#E83F58] hover:underline">
          {lang === 'bn' ? 'মার্কেটপ্লেসে ফিরুন →' : 'Explore Marketplace →'}
        </Link>
      </div>

      {savedProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#ECEAF0] space-y-3">
          <p className="text-sm text-[#777486]">
            {lang === 'bn' ? 'কোনো পণ্য এখনো সেভ করা হয়নি।' : 'No saved products yet.'}
          </p>
          <Link
            to="/marketplace"
            className="inline-block px-5 py-2.5 rounded-2xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
          >
            {t(lang, 'navShop')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#ECEAF0] p-4 space-y-3 shadow-[0_4px_18px_rgba(41,36,59,0.04)]"
            >
              <Link to={`/products/${p.id}`} className="block overflow-hidden rounded-2xl">
                <img src={p.imageUrl} alt={p.titleEn} className="w-full aspect-[4/3] object-cover" />
              </Link>
              <p className="text-sm font-semibold text-[#29243B] line-clamp-2">
                {lang === 'bn' ? p.titleBn : p.titleEn}
              </p>
              <p className="text-sm font-bold text-[#E83F58] tabular-nums">{formatBdt(p.priceBdt, lang)}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addToCart({ productId: p.id, variant: p.variants[0] || 'Standard', quantity: 1 })}
                  className="flex-1 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
                >
                  {t(lang, 'addToCart')}
                </button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(p.id)}
                  className="px-3.5 py-2.5 rounded-xl border border-[#ECEAF0] text-xs font-semibold text-[#777486] hover:text-[#29243B]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { lang, setLang, showToast } = useApp();
  const [privateProfile, setPrivateProfile] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-display font-semibold text-[#29243B]">
        {lang === 'bn' ? 'অ্যাকাউন্ট ও গোপনীয়তা সেটিংস' : 'Account & Privacy Settings'}
      </h1>
      <div className="bg-white rounded-3xl p-6 border border-[#ECEAF0] shadow-[0_6px_24px_rgba(41,36,59,0.04)] space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#29243B]">{lang === 'bn' ? 'ভাষা' : 'Display Language'}</p>
            <p className="text-xs text-[#777486] mt-0.5">Bengali (Default) or English</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLang('bn')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                lang === 'bn'
                  ? 'bg-[#29243B] text-white'
                  : 'bg-[#FAF9F6] border border-[#ECEAF0] text-[#29243B]'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                lang === 'en'
                  ? 'bg-[#29243B] text-white'
                  : 'bg-[#FAF9F6] border border-[#ECEAF0] text-[#29243B]'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 pt-4 border-t border-[#ECEAF0] cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-[#29243B]">
              {lang === 'bn' ? 'প্রাইভেট প্রোফাইল ও শিশুর ছবি সুরক্ষা' : 'Private Profile & Child Photo Protection'}
            </p>
            <p className="text-xs text-[#777486] mt-0.5">
              {lang === 'bn'
                ? 'শুধু অনুমোদিত ফলোয়াররা আপনার ব্যক্তিগত পোস্ট দেখতে পারবেন।'
                : 'Restrict personal family updates to approved followers only.'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={privateProfile}
            onChange={(e) => {
              setPrivateProfile(e.target.checked);
              showToast(e.target.checked ? 'Private mode enabled' : 'Public mode enabled');
            }}
            className="w-4 h-4 accent-[#E83F58]"
          />
        </label>
      </div>
    </div>
  );
};

export const SavedCollectionsPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const [savedPosts, setSavedPosts] = useState<EnrichedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<EnrichedPost | null>(null);

  useEffect(() => {
    apiFetch<{ items: EnrichedPost[] }>('/api/v1/feed?tab=discover&limit=24')
      .then((res) => setSavedPosts((Array.isArray(res?.items) ? res.items : []).filter((p) => p.isSaved)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const handleLike = async (postId: string) => {
    const res = await apiFetch<{ isLiked: boolean; likesCount: number }>(`/api/v1/posts/${postId}/like`, {
      method: 'POST',
    });
    setSavedPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount } : p))
    );
    setSelectedPost((prev) =>
      prev && prev.id === postId ? { ...prev, isLiked: res.isLiked, likesCount: res.likesCount } : prev
    );
  };

  const handleSave = async (postId: string) => {
    const res = await apiFetch<{ isSaved: boolean; savesCount: number }>(`/api/v1/posts/${postId}/save`, {
      method: 'POST',
    });
    if (!res.isSaved) {
      setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
      showToast(lang === 'bn' ? 'সংগ্রহ থেকে সরানো হয়েছে' : 'Removed from collections');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-semibold text-[#29243B] flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-[#845EF7]" />
          {lang === 'bn' ? 'সেভ করা গল্প ও কালেকশন' : 'Saved Stories & Collections'}
        </h1>
        <Link to="/wishlist" className="text-xs font-semibold text-[#E83F58] hover:underline">
          {lang === 'bn' ? 'পছন্দের পণ্য দেখুন →' : 'View Product Wishlist →'}
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[#777486]">{t(lang, 'loading')}</p>
      ) : savedPosts.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#ECEAF0] space-y-3">
          <p className="text-sm text-[#777486]">
            {lang === 'bn' ? 'আপনি এখনো কোনো গল্প বা টিপস সেভ করেননি।' : 'You have not saved any stories or guides yet.'}
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 rounded-2xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
          >
            {t(lang, 'navDiscover')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {savedPosts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onOpen={setSelectedPost}
              onToggleLike={handleLike}
              onToggleSave={handleSave}
            />
          ))}
        </div>
      )}

      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onLike={handleLike}
        onSave={handleSave}
        onFollow={() => {}}
        onBlock={() => setSelectedPost(null)}
      />
    </div>
  );
};
