import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  CornerDownRight,
  EyeOff,
  Flag,
  Heart,
  MessageSquare,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { PostCard, type EnrichedPost } from '../components/PostCard';
import { PostDetailModal } from '../components/PostDetailModal';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { formatCount } from '../lib/domain';
import type { PollItem, QuestionItem } from '../types/platform';

const QA_CATEGORIES = [
  { id: 'all', en: 'All Topics', bn: 'সব বিষয়' },
  { id: 'pregnancy', en: 'Pregnancy', bn: 'গর্ভাবস্থা' },
  { id: 'new_mothers', en: 'New Mothers', bn: 'নতুন মা' },
  { id: 'breastfeeding', en: 'Breastfeeding', bn: 'ব্রেস্টফিডিং' },
  { id: 'newborn', en: 'Newborn Care', bn: 'নবজাতকের যত্ন' },
  { id: 'baby_food', en: 'Baby Nutrition', bn: 'শিশুর পুষ্টি' },
  { id: 'baby_sleep', en: 'Baby Sleep', bn: 'শিশুর ঘুম' },
  { id: 'parenting', en: 'Parenting', bn: 'প্যারেন্টিং' },
  { id: 'child_development', en: 'Child Development', bn: 'শিশুর বিকাশ' },
];

const FOLLOWED_TOPICS_KEY = 'mc_followed_topics_v1';
type CommunityView = 'all' | 'discussions' | 'qa' | 'polls';

export const CommunityPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<EnrichedPost | null>(null);
  const [viewMode, setViewMode] = useState<CommunityView>('all');
  const [category, setCategory] = useState('all');
  const [followedTopics, setFollowedTopics] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FOLLOWED_TOPICS_KEY);
      const parsed = saved ? JSON.parse(saved) : ['pregnancy', 'newborn'];
      return Array.isArray(parsed) ? (parsed as string[]) : ['pregnancy', 'newborn'];
    } catch {
      return ['pregnancy', 'newborn'];
    }
  });
  const [likedQuestionIds, setLikedQuestionIds] = useState<Record<string, boolean>>({});
  const [showAsk, setShowAsk] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [qCat, setQCat] = useState('pregnancy');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<{ qId: string; answerId: string; authorName: string } | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qaRes, feedRes] = await Promise.all([
        apiFetch<{ questions: QuestionItem[]; polls: PollItem[] }>('/api/v1/questions'),
        apiFetch<{ items: EnrichedPost[] }>(`/api/v1/feed?tab=discover&lang=${lang}&limit=20`),
      ]);
      setQuestions(Array.isArray(qaRes?.questions) ? qaRes.questions : []);
      setPolls(Array.isArray(qaRes?.polls) ? qaRes.polls : []);
      setPosts(Array.isArray(feedRes?.items) ? feedRes.items : []);
    } catch {
      // Keep default empty collections on transient API failure
    } finally {
      setLoading(false);
    }
  }, [apiFetch, lang]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFollowTopic = (topicId: string) => {
    if (topicId === 'all') return;
    const exists = followedTopics.includes(topicId);
    const next = exists ? followedTopics.filter((id) => id !== topicId) : [...followedTopics, topicId];
    setFollowedTopics(next);
    try {
      localStorage.setItem(FOLLOWED_TOPICS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    showToast(
      exists
        ? lang === 'bn'
          ? 'টপিক আনফলো করা হয়েছে'
          : 'Unfollowed topic'
        : lang === 'bn'
          ? 'টপিক ফলো করা হয়েছে'
          : 'Following topic updates'
    );
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<QuestionItem>('/api/v1/questions', {
        method: 'POST',
        body: JSON.stringify({ title, body, category: qCat, isAnonymous }),
      });
      setQuestions((prev) => [created, ...prev]);
      setTitle('');
      setBody('');
      setShowAsk(false);
      showToast(lang === 'bn' ? 'আপনার প্রশ্ন পোস্ট করা হয়েছে' : 'Question posted to community');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to post question');
    }
  };

  const handleLikeQuestion = async (qId: string) => {
    try {
      const res = await apiFetch<{ isLiked: boolean; likesCount: number }>(`/api/v1/questions/${qId}/like`, {
        method: 'POST',
      });
      setLikedQuestionIds((prev) => ({ ...prev, [qId]: res.isLiked }));
      setQuestions((prev) => prev.map((q) => (q.id === qId ? { ...q, likesCount: res.likesCount } : q)));
    } catch {
      showToast(lang === 'bn' ? 'লাইক করা যায়নি' : 'Could not update like');
    }
  };

  const handleReportQuestion = async (q: QuestionItem) => {
    try {
      await apiFetch('/api/v1/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'question',
          targetId: q.id,
          reason: 'Community guideline review',
          details: q.titleEn,
        }),
      });
      showToast(lang === 'bn' ? 'রিপোর্ট মডারেশন টিমে পাঠানো হয়েছে' : 'Report sent to moderation team');
    } catch {
      showToast(lang === 'bn' ? 'রিপোর্ট পাঠানো যায়নি' : 'Unable to send report');
    }
  };

  const handleAnswer = async (qId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = (answerDrafts[qId] || '').trim();
    if (!text) return;
    try {
      const ans = await apiFetch<QuestionItem['answers'][number]>(`/api/v1/questions/${qId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId ? { ...q, answers: [...q.answers, ans], answersCount: q.answersCount + 1 } : q
        )
      );
      setAnswerDrafts((prev) => ({ ...prev, [qId]: '' }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not post answer');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyDraft.trim()) return;
    try {
      const reply = await apiFetch<QuestionItem['answers'][number]>(
        `/api/v1/questions/${replyingTo.qId}/answers`,
        {
          method: 'POST',
          body: JSON.stringify({
            body: replyDraft.trim(),
            parentAnswerId: replyingTo.answerId,
          }),
        }
      );
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === replyingTo.qId
            ? { ...q, answers: [...q.answers, reply], answersCount: q.answersCount + 1 }
            : q
        )
      );
      setReplyDraft('');
      setReplyingTo(null);
      showToast(lang === 'bn' ? 'উত্তরের প্রতি-উত্তর যোগ হয়েছে' : 'Reply added');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not post reply');
    }
  };

  const handleBestAnswer = async (qId: string, answerId: string) => {
    const updated = await apiFetch<QuestionItem>(`/api/v1/questions/${qId}/best-answer`, {
      method: 'POST',
      body: JSON.stringify({ answerId }),
    });
    setQuestions((prev) => prev.map((q) => (q.id === qId ? updated : q)));
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    const updated = await apiFetch<PollItem>(`/api/v1/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
    setPolls((prev) => prev.map((p) => (p.id === pollId ? updated : p)));
    showToast(lang === 'bn' ? 'ভোট গ্রহণ করা হয়েছে' : 'Vote recorded');
  };

  const handleTogglePostLike = async (postId: string) => {
    const res = await apiFetch<{ isLiked: boolean; likesCount: number }>(`/api/v1/posts/${postId}/like`, {
      method: 'POST',
    });
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount } : p))
    );
    setSelectedPost((prev) =>
      prev && prev.id === postId ? { ...prev, isLiked: res.isLiked, likesCount: res.likesCount } : prev
    );
  };

  const handleTogglePostSave = async (postId: string) => {
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
  };

  const handleFollowAuthor = async (authorId: string) => {
    const res = await apiFetch<{ isFollowing: boolean }>(`/api/v1/users/${authorId}/follow`, {
      method: 'POST',
    });
    setPosts((prev) =>
      prev.map((p) => (p.authorId === authorId ? { ...p, isFollowingAuthor: res.isFollowing } : p))
    );
    setSelectedPost((prev) =>
      prev && prev.authorId === authorId ? { ...prev, isFollowingAuthor: res.isFollowing } : prev
    );
  };

  const matchesTopic = (itemCategory: string) => {
    if (category === 'all') return true;
    if (itemCategory === category) return true;
    if (category === 'new_mothers' && (itemCategory === 'motherhood' || itemCategory === 'mother_wellness')) return true;
    if (category === 'child_development' && (itemCategory === 'baby_development' || itemCategory === 'parenting')) {
      return true;
    }
    return false;
  };

  const filteredQuestions = questions.filter((q) => matchesTopic(q.category));
  const filteredPosts = posts.filter((p) => matchesTopic(p.category));
  const activeTopicMeta = QA_CATEGORIES.find((c) => c.id === category);
  const isTopicFollowed = category !== 'all' && followedTopics.includes(category);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#29243B]">
            {lang === 'bn' ? 'মাতৃত্ব কমিউনিটি ও আলোচনা' : 'Motherhood Community'}
          </h1>
          <p className="text-sm text-[#777486] mt-1">
            {lang === 'bn'
              ? 'অভিজ্ঞ মায়েদের গল্প, প্রশ্নোত্তর, পোল এবং ডাক্তার-যাচাইকৃত পরামর্শ।'
              : 'Discussions, photo stories, anonymous Q&A, live polls, and verified doctor answers.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setShowAsk((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6478] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t(lang, 'askQuestion')}
          </button>
          <Link
            to="/create/photo"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#ECEAF0] hover:border-[#29243B] text-xs font-semibold text-[#29243B]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D93B52]" />
            {lang === 'bn' ? 'পোস্ট লিখুন' : 'Share Story'}
          </Link>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all' as const, en: 'All Community', bn: 'সব কমিউনিটি' },
          { id: 'discussions' as const, en: `Discussions (${filteredPosts.length})`, bn: `আলোচনা (${filteredPosts.length})` },
          { id: 'qa' as const, en: `Q&A (${filteredQuestions.length})`, bn: `প্রশ্নোত্তর (${filteredQuestions.length})` },
          { id: 'polls' as const, en: `Polls (${polls.length})`, bn: `পোল (${polls.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setViewMode(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              viewMode === tab.id
                ? 'bg-[#29243B] text-white'
                : 'bg-white border border-[#ECEAF0] text-[#777486] hover:text-[#29243B]'
            }`}
          >
            {lang === 'bn' ? tab.bn : tab.en}
          </button>
        ))}
      </div>

      {showAsk && (
        <form onSubmit={handleAsk} className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qa-title" className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'প্রশ্নের শিরোনাম' : 'Question Title'}
              </label>
              <input
                id="qa-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={lang === 'bn' ? 'আপনার প্রশ্নটি সংক্ষেপে লিখুন...' : 'Summarize your question...'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
              />
            </div>
            <div>
              <label htmlFor="qa-cat" className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'বিষয়' : 'Topic'}
              </label>
              <select
                id="qa-cat"
                value={qCat}
                onChange={(e) => setQCat(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
              >
                {QA_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c[lang]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="qa-body" className="block text-xs font-semibold mb-1">
              {lang === 'bn' ? 'বিস্তারিত' : 'Details'}
            </label>
            <textarea
              id="qa-body"
              rows={3}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#29243B]/80 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="accent-[#E83F58]"
            />
            <EyeOff className="w-3.5 h-3.5 text-[#D93B52]" />
            <span>
              {lang === 'bn'
                ? 'নাম গোপন রেখে প্রশ্ন করুন (জনসমক্ষে আপনার নাম দেখাবে না)'
                : 'Ask anonymously (hides your name publicly while keeping moderation safety)'}
            </span>
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#29243B] text-white text-xs font-semibold hover:bg-[#E83F58]"
            >
              {lang === 'bn' ? 'প্রশ্ন প্রকাশ করুন' : 'Post Question'}
            </button>
            <button
              type="button"
              onClick={() => setShowAsk(false)}
              className="px-4 py-2 rounded-xl border border-[#ECEAF0] text-xs font-medium"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* 8-Category Topic Filter + Follow Topic */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {QA_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                category === c.id
                  ? 'bg-[#EDE5FF] border border-[#B8A5F5] text-[#29243B]'
                  : 'bg-white border border-[#ECEAF0] text-[#777486] hover:text-[#29243B]'
              }`}
            >
              {c[lang]}
            </button>
          ))}
        </div>

        {category !== 'all' && activeTopicMeta && (
          <button
            type="button"
            onClick={() => toggleFollowTopic(category)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors self-start ${
              isTopicFollowed
                ? 'bg-[#E0F3EA] text-[#1E5A40] border border-[#B8DCCB]'
                : 'bg-white border border-[#ECEAF0] text-[#29243B] hover:border-[#FF6478]'
            }`}
          >
            {isTopicFollowed ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            <span>
              {isTopicFollowed
                ? lang === 'bn'
                  ? `${activeTopicMeta.bn} ফলো করছেন`
                  : `Following ${activeTopicMeta.en}`
                : lang === 'bn'
                  ? `${activeTopicMeta.bn} ফলো করুন`
                  : `Follow ${activeTopicMeta.en}`}
            </span>
          </button>
        )}
      </div>

      {/* Discussions / Stories Masonry Feed */}
      {(viewMode === 'all' || viewMode === 'discussions') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#29243B]">
              {lang === 'bn' ? 'মায়েদের পোস্ট ও অভিজ্ঞতা' : 'Discussions & Mother Stories'}
            </h2>
            <Link to="/discover" className="text-xs font-semibold text-[#D93B52] hover:underline">
              {lang === 'bn' ? 'ফুল স্ক্রিন ডিসকভার →' : 'Full Discover Feed →'}
            </Link>
          </div>
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-[#ECEAF0] text-center text-xs text-[#777486]">
              {lang === 'bn' ? 'এই বিষয়ে এখনো কোনো পোস্ট নেই।' : 'No stories in this topic yet.'}
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4">
              {(viewMode === 'all' ? filteredPosts.slice(0, 4) : filteredPosts).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onOpen={setSelectedPost}
                  onToggleLike={handleTogglePostLike}
                  onToggleSave={handleTogglePostSave}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {(viewMode === 'all' || viewMode === 'qa' || viewMode === 'polls') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Editorial Q&A Feed */}
          {(viewMode === 'all' || viewMode === 'qa') && (
            <div className={`${viewMode === 'qa' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4`}>
              {loading ? (
                <div className="h-40 bg-white rounded-3xl animate-pulse border border-[#ECEAF0]" />
              ) : filteredQuestions.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-[#ECEAF0] text-center text-sm text-[#777486]">
                  {lang === 'bn'
                    ? 'এই বিষয়ে এখনো কোনো প্রশ্ন নেই। প্রথম প্রশ্নটি আপনি করুন!'
                    : 'No questions in this topic yet. Ask the first question!'}
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const topAnswers = q.answers.filter((a) => !a.parentAnswerId);
                  const repliesByParent = new Map<string, QuestionItem['answers']>();
                  for (const ans of q.answers) {
                    if (ans.parentAnswerId) {
                      const arr = repliesByParent.get(ans.parentAnswerId) ?? [];
                      arr.push(ans);
                      repliesByParent.set(ans.parentAnswerId, arr);
                    }
                  }
                  const liked = Boolean(likedQuestionIds[q.id]);

                  return (
                    <article key={q.id} className="bg-white rounded-3xl p-5 sm:p-6 border border-[#ECEAF0] space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#777486]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#29243B]">
                              {q.isAnonymous ? t(lang, 'anonymousLabel') : q.authorDisplayName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{QA_CATEGORIES.find((c) => c.id === q.category)?.[lang] ?? q.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {formatCount(q.answersCount, lang)} {lang === 'bn' ? 'উত্তর' : 'answers'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleLikeQuestion(q.id)}
                              aria-label="Like question"
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                                liked ? 'bg-[#FFE3D9] text-[#D93B52]' : 'bg-[#FAF9F6] text-[#777486] hover:text-[#29243B]'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-[#FF6478] text-[#FF6478]' : ''}`} />
                              <span className="tabular-nums">{formatCount(q.likesCount, lang)}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(`${window.location.origin}/community`).catch(() => {});
                                showToast(lang === 'bn' ? 'আলোচনার লিংক কপি হয়েছে' : 'Discussion link copied');
                              }}
                              aria-label="Share question"
                              className="p-1.5 rounded-xl bg-[#FAF9F6] text-[#777486] hover:text-[#29243B]"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReportQuestion(q)}
                              aria-label="Report question"
                              className="p-1.5 rounded-xl bg-[#FAF9F6] text-[#777486] hover:text-[#D93B52]"
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h2 className="text-lg font-semibold text-[#29243B]">
                          {lang === 'bn' ? q.titleBn : q.titleEn}
                        </h2>
                        <p className="text-sm text-[#29243B]/80 leading-relaxed">
                          {lang === 'bn' ? q.bodyBn : q.bodyEn}
                        </p>
                      </div>

                      {/* Answers + Nested Replies */}
                      <div className="space-y-2.5 pt-3 border-t border-[#ECEAF0]">
                        {topAnswers.map((ans) => {
                          const isBest = q.bestAnswerId === ans.id;
                          const highlightMint = isBest || ans.isDoctorVerified;
                          const nestedReplies = repliesByParent.get(ans.id) ?? [];
                          return (
                            <div key={ans.id} className="space-y-2">
                              <div
                                className={`p-4 rounded-2xl border space-y-1.5 ${
                                  highlightMint
                                    ? 'bg-[#E0F3EA]/70 border-[#B8DCCB]'
                                    : 'bg-[#FAF9F6] border-[#ECEAF0]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="font-semibold text-[#29243B] flex items-center gap-1.5">
                                    {ans.authorName}
                                    {ans.isDoctorVerified && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E5A40]">
                                        <ShieldCheck className="w-3.5 h-3.5" aria-label="Doctor" />
                                        {t(lang, 'verifiedDoctor')}
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {isBest ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E5A40]">
                                        <Award className="w-3.5 h-3.5" />
                                        {t(lang, 'bestAnswer')}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleBestAnswer(q.id, ans.id)}
                                        className="text-[11px] text-[#777486] hover:text-[#29243B]"
                                      >
                                        {lang === 'bn' ? 'সেরা উত্তর চিহ্নিত করুন' : 'Mark best'}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReplyingTo({ qId: q.id, answerId: ans.id, authorName: ans.authorName })
                                      }
                                      className="text-[11px] font-semibold text-[#D93B52] hover:underline"
                                    >
                                      {lang === 'bn' ? 'উত্তর দিন' : 'Reply'}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-[#29243B]/85 leading-relaxed">{ans.body}</p>
                              </div>

                              {nestedReplies.length > 0 && (
                                <div className="pl-5 space-y-1.5">
                                  {nestedReplies.map((rep) => (
                                    <div
                                      key={rep.id}
                                      className="p-3 rounded-xl bg-white border border-[#ECEAF0] text-xs space-y-0.5 flex items-start gap-2"
                                    >
                                      <CornerDownRight className="w-3.5 h-3.5 text-[#777486] shrink-0 mt-0.5" />
                                      <div>
                                        <span className="font-semibold text-[#29243B]">{rep.authorName}</span>
                                        <p className="text-[#29243B]/80 mt-0.5">{rep.body}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {replyingTo?.answerId === ans.id && replyingTo.qId === q.id && (
                                <form onSubmit={handleReplySubmit} className="pl-5 flex gap-2">
                                  <input
                                    autoFocus
                                    value={replyDraft}
                                    onChange={(e) => setReplyDraft(e.target.value)}
                                    placeholder={
                                      lang === 'bn'
                                        ? `${replyingTo.authorName}-কে উত্তর লিখুন...`
                                        : `Reply to ${replyingTo.authorName}...`
                                    }
                                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs"
                                  />
                                  <button
                                    type="submit"
                                    className="px-3 py-1.5 rounded-xl bg-[#29243B] text-white text-xs font-semibold"
                                  >
                                    {lang === 'bn' ? 'পাঠান' : 'Send'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setReplyingTo(null)}
                                    className="px-2.5 py-1.5 rounded-xl border border-[#ECEAF0] text-xs"
                                  >
                                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                                  </button>
                                </form>
                              )}
                            </div>
                          );
                        })}

                        <form onSubmit={(e) => handleAnswer(q.id, e)} className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={answerDrafts[q.id] || ''}
                            onChange={(e) => setAnswerDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                            placeholder={lang === 'bn' ? 'সহায়ক উত্তর লিখুন...' : 'Write a supportive answer...'}
                            aria-label="Answer input"
                            className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-2 rounded-xl bg-[#29243B] text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-[#E83F58]"
                          >
                            <Send className="w-3 h-3" />
                            {t(lang, 'submitAnswer')}
                          </button>
                        </form>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}

          {/* Community Polls Sidebar */}
          {(viewMode === 'all' || viewMode === 'polls') && (
            <aside className={`${viewMode === 'polls' ? 'lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4' : 'lg:col-span-4 space-y-4'}`}>
              {polls.map((poll) => (
                <div key={poll.id} className="bg-white rounded-3xl p-5 border border-[#ECEAF0] space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#D93B52] font-semibold">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'কমিউনিটি পোল' : 'Community Poll'}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#29243B]">
                    {lang === 'bn' ? poll.questionBn : poll.questionEn}
                  </h3>
                  <div className="space-y-2">
                    {poll.options.map((opt) => {
                      const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleVotePoll(poll.id, opt.id)}
                          className="w-full text-left p-3 rounded-xl border border-[#ECEAF0] hover:border-[#B8A5F5] bg-[#FAF9F6] space-y-1.5 transition-colors"
                        >
                          <div className="flex justify-between text-xs font-medium text-[#29243B]">
                            <span>{lang === 'bn' ? opt.labelBn : opt.labelEn}</span>
                            <span className="tabular-nums font-semibold">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#ECEAF0] overflow-hidden">
                            <div className="h-full bg-[#FF6478]" style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#777486] tabular-nums flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#1E5A40]" />
                    {formatCount(poll.totalVotes, lang)} {lang === 'bn' ? 'জন অংশগ্রহণ করেছেন' : 'votes'}
                  </p>
                </div>
              ))}
            </aside>
          )}
        </div>
      )}

      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onLike={handleTogglePostLike}
        onSave={handleTogglePostSave}
        onFollow={handleFollowAuthor}
        onBlock={() => setSelectedPost(null)}
      />
    </div>
  );
};
