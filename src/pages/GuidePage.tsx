import React, { useEffect, useState } from 'react';
import { Bookmark, BookOpen, Clock, FileCheck2, FileWarning, Plus, Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { filterGuidesByTopic, toggleGuideBookmark } from '../lib/domain';
import type { GuideArticle } from '../types/platform';

const GUIDE_TOPICS = [
  { id: 'all', en: 'All Guides', bn: 'সব গাইড' },
  { id: 'pregnancy-week-by-week', en: 'Pregnancy Week by Week', bn: 'সপ্তাহভিত্তিক গর্ভাবস্থা' },
  { id: 'trimester-guide', en: 'Trimester Guide', bn: 'ত্রৈমাসিক গাইড' },
  { id: 'pregnancy-nutrition', en: 'Pregnancy Nutrition', bn: 'গর্ভাবস্থার পুষ্টি' },
  { id: 'hospital-bag-checklist', en: 'Hospital Bag Checklist', bn: 'হসপিটাল ব্যাগ' },
  { id: 'labour-delivery', en: 'Labour & Delivery', bn: 'প্রসব প্রস্তুতি' },
  { id: 'breastfeeding', en: 'Breastfeeding', bn: 'ব্রেস্টফিডিং' },
  { id: 'postpartum-recovery', en: 'Postpartum Recovery', bn: 'প্রসব পরবর্তী যত্ন' },
  { id: 'mother-wellness', en: 'Mother Wellness', bn: 'মায়ের সুস্থতা' },
  { id: 'new-mother-guide', en: 'New Mother Guide', bn: 'নতুন মায়ের গাইড' },
];

const GUIDE_CATS = [
  { id: 'pregnancy', en: 'Pregnancy', bn: 'গর্ভাবস্থা' },
  { id: 'mother_care', en: 'Mother Care', bn: 'মায়ের যত্ন' },
  { id: 'baby_care', en: 'Baby Care', bn: 'শিশুর যত্ন' },
  { id: 'child_development', en: 'Child Development', bn: 'শিশুর বিকাশ' },
];

const SAVED_GUIDES_KEY = 'mc_saved_guide_ids_v1';

export const GuidePage: React.FC<{ initialCategory?: string }> = ({ initialCategory = 'all' }) => {
  const { lang, apiFetch, showToast } = useApp();
  const [articles, setArticles] = useState<GuideArticle[]>([]);
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_GUIDES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [activeArticle, setActiveArticle] = useState<GuideArticle | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [draftTitleEn, setDraftTitleEn] = useState('');
  const [draftTitleBn, setDraftTitleBn] = useState('');
  const [draftCat, setDraftCat] = useState('pregnancy');
  const [draftBodyEn, setDraftBodyEn] = useState('');

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    apiFetch<GuideArticle[]>('/api/v1/guides').then(setArticles).catch(() => {});
  }, [apiFetch]);

  const handleToggleBookmark = (guideId: string) => {
    const next = toggleGuideBookmark(savedIds, guideId);
    setSavedIds(next);
    try {
      localStorage.setItem(SAVED_GUIDES_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    const isNowSaved = next.includes(guideId);
    showToast(
      isNowSaved
        ? lang === 'bn'
          ? 'গাইড বুকমার্ক করা হয়েছে'
          : 'Guide bookmarked'
        : lang === 'bn'
          ? 'বুকমার্ক থেকে সরানো হয়েছে'
          : 'Removed from saved guides'
    );
  };

  const handleSubmitGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<GuideArticle>('/api/v1/guides', {
        method: 'POST',
        body: JSON.stringify({
          titleEn: draftTitleEn,
          titleBn: draftTitleBn || draftTitleEn,
          category: draftCat,
          bodyEn: draftBodyEn,
          bodyBn: draftBodyEn,
        }),
      });
      setArticles((prev) => [created, ...prev]);
      setDraftTitleEn('');
      setDraftTitleBn('');
      setDraftBodyEn('');
      setShowEditor(false);
      showToast(
        lang === 'bn'
          ? 'নিবন্ধ সংরক্ষিত হয়েছে (চিকিৎসক পর্যালোচনা অপেক্ষমাণ)'
          : 'Article saved (pending medical review)'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save guide');
    }
  };

  const filtered = filterGuidesByTopic(articles, category, query, savedOnly, savedIds);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-[#29243B]">
            {lang === 'bn'
              ? 'মায়ের গাইড — দ্বিভাষিক স্বাস্থ্য ও প্যারেন্টিং লাইব্রেরি'
              : 'Mother’s Guide — Bilingual Editorial Library'}
          </h1>
          <p className="text-sm text-[#777486] mt-1">
            {lang === 'bn'
              ? 'গর্ভাবস্থা, প্রসব প্রস্তুতি, ব্রেস্টফিডিং, প্রসব পরবর্তী যত্ন ও মায়ের সুস্থতার নির্ভরযোগ্য গাইড।'
              : 'Pregnancy week-by-week, trimesters, hospital bag, labour, breastfeeding & postpartum care.'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setSavedOnly((s) => !s)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${
              savedOnly
                ? 'bg-[#29243B] text-white'
                : 'bg-white border border-[#ECEAF0] text-[#29243B] hover:border-[#FF6478]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${savedOnly ? 'fill-white' : 'text-[#FF6478]'}`} />
            <span>
              {lang === 'bn' ? `বুকমার্ক (${savedIds.length})` : `Saved (${savedIds.length})`}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowEditor((s) => !s)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-semibold text-[#29243B] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#E83F58]" />
            {lang === 'bn' ? 'এডিটর' : 'Add Guide'}
          </button>
        </div>
      </div>

      {showEditor && (
        <form onSubmit={handleSubmitGuide} className="bg-white rounded-3xl p-6 border border-[#ECEAF0] shadow-sm space-y-4">
          <p className="text-xs text-[#777486]">
            {lang === 'bn'
              ? 'দ্রষ্টব্য: নতুন জমা দেওয়া নিবন্ধ মেডিকেল রিভিউ সম্পন্ন না হওয়া পর্যন্ত চিকিৎসক-যাচাইকৃত ব্যাজ পাবে না।'
              : 'Editorial Policy: New submissions appear without an expert-reviewed badge until reviewed by a verified doctor.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              required
              placeholder="Title (English)"
              value={draftTitleEn}
              onChange={(e) => setDraftTitleEn(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
            />
            <input
              placeholder="শিরোনাম (বাংলা)"
              value={draftTitleBn}
              onChange={(e) => setDraftTitleBn(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
            />
            <select
              value={draftCat}
              onChange={(e) => setDraftCat(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
            >
              {GUIDE_CATS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c[lang]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            required
            rows={3}
            placeholder="Write article content..."
            value={draftBodyEn}
            onChange={(e) => setDraftBodyEn(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
          >
            Submit Draft Article
          </button>
        </form>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {GUIDE_TOPICS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                category === c.id
                  ? 'bg-[#EDE5FF] text-[#29243B] border border-[#B8A5F5]'
                  : 'bg-white border border-[#ECEAF0] text-[#777486] hover:text-[#29243B]'
              }`}
            >
              {c[lang]}
            </button>
          ))}
        </div>
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-[#777486] absolute left-3.5 top-2.5" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === 'bn' ? 'গাইড খুঁজুন...' : 'Search guides...'}
            className="pl-9 pr-3.5 py-2 rounded-2xl bg-white border border-[#ECEAF0] text-xs text-[#29243B] placeholder:text-[#777486] w-full sm:w-60 focus:outline-none focus:border-[#B8A5F5]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-[#ECEAF0] text-center space-y-2">
          <p className="text-sm font-semibold text-[#29243B]">
            {savedOnly
              ? lang === 'bn'
                ? 'এখনো কোনো গাইড বুকমার্ক করা হয়নি।'
                : 'No bookmarked guides yet.'
              : lang === 'bn'
                ? 'এই বিষয়ে কোনো গাইড পাওয়া যায়নি।'
                : 'No guides matched your filter.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory('all');
              setQuery('');
              setSavedOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-[#29243B] text-white text-xs font-semibold"
          >
            {lang === 'bn' ? 'সব গাইড দেখুন' : 'Show All Guides'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((art) => {
            const isSaved = savedIds.includes(art.id);
            return (
              <article
                key={art.id}
                className="bg-white rounded-3xl overflow-hidden border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)] flex flex-col group"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={art.imageUrl}
                    alt={art.titleEn}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-video object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(art.id)}
                    aria-label={isSaved ? 'Remove bookmark' : 'Bookmark guide'}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 border border-[#ECEAF0] flex items-center justify-center shadow-xs hover:border-[#FF6478]"
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isSaved ? 'fill-[#FF6478] text-[#FF6478]' : 'text-[#29243B]'}`}
                    />
                  </button>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {art.isMedicallyReviewed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#E0F3EA] border border-[#B8DCCB] text-[#1E5A40] font-semibold">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          {t(lang, 'medicallyReviewed')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#777486] font-medium">
                          <FileWarning className="w-3.5 h-3.5" />
                          {t(lang, 'unreviewedDraft')}
                        </span>
                      )}
                      <span aria-hidden="true" className="text-[#ECEAF0]">·</span>
                      <span className="inline-flex items-center gap-1 text-[#777486]">
                        <Clock className="w-3 h-3" />
                        {art.readTimeMin} min
                      </span>
                    </div>
                    <h2 className="text-lg font-display font-semibold text-[#29243B] leading-snug">
                      {lang === 'bn' ? art.titleBn : art.titleEn}
                    </h2>
                    <p className="text-sm text-[#777486] line-clamp-2 leading-relaxed">
                      {lang === 'bn' ? art.summaryBn : art.summaryEn}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#ECEAF0] text-xs">
                    <span className="text-[#777486] font-medium">{art.authorName}</span>
                    <button
                      type="button"
                      onClick={() => setActiveArticle(art)}
                      className="inline-flex items-center gap-1.5 font-semibold text-[#E83F58] hover:underline"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      {lang === 'bn' ? 'পড়ুন' : 'Read Guide'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#29243B]/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 space-y-4 border border-[#ECEAF0] shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                  activeArticle.isMedicallyReviewed
                    ? 'bg-[#E0F3EA] text-[#1E5A40] border border-[#B8DCCB]'
                    : 'bg-[#FAF9F6] text-[#777486] border border-[#ECEAF0]'
                }`}
              >
                {activeArticle.isMedicallyReviewed ? t(lang, 'medicallyReviewed') : t(lang, 'unreviewedDraft')}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleBookmark(activeArticle.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#ECEAF0] text-xs font-semibold text-[#29243B]"
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      savedIds.includes(activeArticle.id) ? 'fill-[#FF6478] text-[#FF6478]' : ''
                    }`}
                  />
                  {savedIds.includes(activeArticle.id)
                    ? lang === 'bn'
                      ? 'সেভ করা'
                      : 'Saved'
                    : lang === 'bn'
                      ? 'সেভ'
                      : 'Save'}
                </button>
                <button
                  type="button"
                  aria-label="Close guide"
                  onClick={() => setActiveArticle(null)}
                  className="p-2 rounded-full hover:bg-[#FAF9F6] text-[#777486] hover:text-[#29243B]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h2 className="text-2xl font-display font-semibold text-[#29243B]">
              {lang === 'bn' ? activeArticle.titleBn : activeArticle.titleEn}
            </h2>
            <p className="text-xs text-[#777486]">
              {activeArticle.authorName}
              {activeArticle.medicalReviewerName ? ` · Reviewed by ${activeArticle.medicalReviewerName}` : ''} · Updated{' '}
              {activeArticle.updatedAt}
            </p>
            <img
              src={activeArticle.imageUrl}
              alt={activeArticle.titleEn}
              className="w-full aspect-video object-cover rounded-2xl"
            />
            <p className="text-sm text-[#29243B]/90 leading-relaxed whitespace-pre-line">
              {lang === 'bn' ? activeArticle.bodyBn : activeArticle.bodyEn}
            </p>
            <div className="pt-4 border-t border-[#ECEAF0] text-xs text-[#777486] space-y-1">
              <p className="font-semibold text-[#29243B]">References</p>
              {activeArticle.references.map((ref) => (
                <p key={ref}>• {ref}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
