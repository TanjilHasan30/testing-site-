import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Film, ImagePlus, MessageSquarePlus, Play, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORY_LABELS } from '../i18n/translations';
import { formatBdt, validatePostInput } from '../lib/domain';
import type { PostType, ProductItem } from '../types/platform';

const POST_MODES: { id: PostType; labelEn: string; labelBn: string }[] = [
  { id: 'short_video', labelEn: 'Upload Video', labelBn: 'ভিডিও আপলোড' },
  { id: 'photo', labelEn: 'Photo Post', labelBn: 'ছবির পোস্ট' },
  { id: 'question', labelEn: 'Ask Question', labelBn: 'প্রশ্ন করুন' },
  { id: 'poll', labelEn: 'Create Poll', labelBn: 'পোল তৈরি করুন' },
  { id: 'review', labelEn: 'Product Review', labelBn: 'পণ্য রিভিউ' },
];

export const CreatePage: React.FC<{ initialType?: PostType }> = ({ initialType = 'photo' }) => {
  const { lang, apiFetch, showToast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryMode = params.get('mode') as PostType | null;

  const [type, setType] = useState<PostType>(queryMode || initialType);
  useEffect(() => {
    setType(queryMode || initialType);
  }, [initialType, queryMode]);

  const [category, setCategory] = useState('baby_care');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtagsText, setHashtagsText] = useState('motherhood, bangladesh');
  const [location, setLocation] = useState('Dhaka');
  const [mediaPreview, setMediaPreview] = useState('/src/assets/images/feed_mother_newborn_1794921207230.jpg');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoDurationSec, setVideoDurationSec] = useState(45);
  const [videoProviderStatus, setVideoProviderStatus] = useState<string | null>(null);
  const [isSponsored, setIsSponsored] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [pollOpt1, setPollOpt1] = useState('');
  const [pollOpt2, setPollOpt2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ products: ProductItem[] }>('/api/v1/products')
      .then((res) => setProducts(res.products))
      .catch(() => {});
  }, [apiFetch]);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      setError('Image size must be under 2.5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaPreview(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > 15 * 1024 * 1024) {
      setError(lang === 'bn' ? 'ভিডিও ফাইল ১৫ এমবি-র কম হতে হবে।' : 'Video file must be under 15MB.');
      return;
    }
    setVideoUploading(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Could not read video file'));
        };
        reader.onerror = () => reject(new Error('Could not read video file'));
        reader.readAsDataURL(file);
      });
      const res = await apiFetch<{ videoUrl: string; message: string; status: string }>('/api/v1/videos/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          base64Data,
          durationSec: videoDurationSec,
        }),
      });
      setUploadedVideoUrl(res.videoUrl);
      setVideoProviderStatus(res.message);
      showToast(lang === 'bn' ? 'ভিডিও আপলোড সম্পন্ন হয়েছে!' : 'Video uploaded and ready!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid video file');
    } finally {
      setVideoUploading(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (type === 'question') {
      try {
        setSubmitting(true);
        await apiFetch('/api/v1/questions', {
          method: 'POST',
          body: JSON.stringify({ title, body: caption, category, isAnonymous: false }),
        });
        showToast(lang === 'bn' ? 'প্রশ্ন প্রকাশিত হয়েছে' : 'Question published');
        navigate('/community');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to publish question');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (type === 'poll') {
      try {
        setSubmitting(true);
        await apiFetch('/api/v1/polls', {
          method: 'POST',
          body: JSON.stringify({ question: title, options: [pollOpt1, pollOpt2] }),
        });
        showToast(lang === 'bn' ? 'পোল প্রকাশিত হয়েছে' : 'Community poll published');
        navigate('/community');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Poll question and 2 options required');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const validationErr = validatePostInput({
      title,
      caption,
      category,
      videoDurationSec: type === 'short_video' ? videoDurationSec : undefined,
    });
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSubmitting(true);
    try {
      const mediaUrls =
        type === 'short_video'
          ? [uploadedVideoUrl || '/videos/newborn.mp4', mediaPreview]
          : [mediaPreview];
      const created = await apiFetch<{ id: string }>('/api/v1/posts', {
        method: 'POST',
        body: JSON.stringify({
          type,
          category,
          titleEn: title,
          titleBn: title,
          captionEn: caption,
          captionBn: caption,
          mediaUrls,
          aspectRatio: type === 'short_video' ? '9:16' : '4:3',
          videoDurationSec: type === 'short_video' ? videoDurationSec : undefined,
          hashtags: hashtagsText
            .split(',')
            .map((s) => s.trim().replace(/^#/, ''))
            .filter(Boolean),
          taggedProductIds: selectedProductId ? [selectedProductId] : [],
          location,
          isSponsored,
        }),
      });
      showToast(
        type === 'short_video'
          ? lang === 'bn'
            ? 'ভিডিও সফলভাবে প্রকাশিত হয়েছে!'
            : 'Video published to Videos feed!'
          : lang === 'bn'
            ? 'পোস্ট সফলভাবে প্রকাশিত হয়েছে!'
            : 'Story published to Community feed!'
      );
      navigate(type === 'short_video' ? `/videos?v=${created.id}` : '/community');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#29243B]">
          {lang === 'bn' ? 'ক্রিয়েশন স্টুডিও' : 'Content Creation Studio'}
        </h1>
        <p className="text-sm text-[#777486]">
          {lang === 'bn'
            ? 'ছবি, শর্ট ভিডিও, পণ্যের রিভিউ, প্রশ্ন বা পোল তৈরি করে লাইভ প্রিভিউ দেখুন।'
            : 'Craft photo stories, short videos, product reviews, questions, or polls with live preview.'}
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-wrap gap-2">
        {POST_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setType(m.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              type === m.id
                ? 'bg-[#29243B] text-white'
                : 'bg-white border border-[#ECEAF0] text-[#777486] hover:border-[#B8A5F5] hover:text-[#29243B]'
            }`}
          >
            {lang === 'bn' ? m.labelBn : m.labelEn}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handlePublish} className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-[#FFE3D9] text-[#D93B52] text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="post-title" className="block text-xs font-semibold text-[#29243B] mb-1.5">
              {type === 'poll' ? (lang === 'bn' ? 'পোলের প্রশ্ন' : 'Poll Question') : lang === 'bn' ? 'শিরোনাম' : 'Title'}
            </label>
            <input
              id="post-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === 'bn' ? 'যেমন: নবজাতকের জন্য মসলিন কাঁথার অভিজ্ঞতা' : 'e.g. Gentle newborn bedtime routine in Dhaka'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
            />
          </div>

          {type === 'poll' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="poll-opt1" className="block text-xs font-semibold text-[#29243B] mb-1">
                  Option 1
                </label>
                <input
                  id="poll-opt1"
                  required
                  value={pollOpt1}
                  onChange={(e) => setPollOpt1(e.target.value)}
                  placeholder="e.g. 6 months"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
                />
              </div>
              <div>
                <label htmlFor="poll-opt2" className="block text-xs font-semibold text-[#29243B] mb-1">
                  Option 2
                </label>
                <input
                  id="poll-opt2"
                  required
                  value={pollOpt2}
                  onChange={(e) => setPollOpt2(e.target.value)}
                  placeholder="e.g. 7 months"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="post-category" className="block text-xs font-semibold text-[#29243B] mb-1.5">
                    {lang === 'bn' ? 'বিভাগ' : 'Category'}
                  </label>
                  <select
                    id="post-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
                  >
                    {Object.entries(CATEGORY_LABELS)
                      .filter(([k]) => k !== 'all')
                      .map(([key, labels]) => (
                        <option key={key} value={key}>
                          {labels[lang]}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="post-location" className="block text-xs font-semibold text-[#29243B] mb-1.5">
                    {lang === 'bn' ? 'অবস্থান (ঐচ্ছিক)' : 'Location (Optional)'}
                  </label>
                  <input
                    id="post-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="post-caption" className="block text-xs font-semibold text-[#29243B] mb-1.5">
                  {lang === 'bn' ? 'বিস্তারিত বিবরণ' : 'Story / Caption'}
                </label>
                <textarea
                  id="post-caption"
                  rows={4}
                  required
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={lang === 'bn' ? 'অন্যান্য মায়েদের সাথে আপনার অভিজ্ঞতা শেয়ার করুন...' : 'Share your story, recipe, or helpful parenting tips...'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
                />
              </div>

              {type === 'short_video' ? (
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#29243B] flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-[#D93B52]" />
                      {lang === 'bn' ? 'শর্ট ভিডিও আপলোড (সর্বোচ্চ ৩ মিনিট)' : 'Short Video Upload (MP4/MOV, Max 3 min)'}
                    </span>
                    <span className="text-xs text-[#777486] tabular-nums">{videoDurationSec}s</span>
                  </div>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleVideoFile}
                    disabled={videoUploading}
                    className="block w-full text-xs text-[#777486]"
                  />
                  {videoUploading && (
                    <p className="text-xs text-[#D93B52] font-medium">
                      {lang === 'bn' ? 'ভিডিও আপলোড হচ্ছে...' : 'Uploading video to studio...'}
                    </p>
                  )}
                  <label className="block text-xs text-[#777486]">
                    Duration (seconds, max 180):
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={videoDurationSec}
                      onChange={(e) => setVideoDurationSec(Number(e.target.value))}
                      className="ml-2 w-20 px-2 py-1 rounded-lg border border-[#ECEAF0] bg-white text-[#29243B] tabular-nums"
                    />
                  </label>
                  {videoProviderStatus && (
                    <p className="text-xs text-[#1E5A40] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {videoProviderStatus}
                    </p>
                  )}
                </div>
              ) : (
                type !== 'question' && (
                  <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] space-y-2">
                    <label className="text-xs font-semibold text-[#29243B] flex items-center gap-1.5">
                      <ImagePlus className="w-4 h-4 text-[#D93B52]" />
                      {lang === 'bn' ? 'ছবি নির্বাচন করুন' : 'Upload Cover / Story Image'}
                    </label>
                    <input type="file" accept="image/*" onChange={handleImageFile} className="block w-full text-xs text-[#777486]" />
                  </div>
                )
              )}

              {type !== 'question' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="post-tags" className="block text-xs font-semibold text-[#29243B] mb-1.5">
                        {lang === 'bn' ? 'হ্যাশট্যাগ (কমা দিয়ে)' : 'Hashtags (comma separated)'}
                      </label>
                      <input
                        id="post-tags"
                        type="text"
                        value={hashtagsText}
                        onChange={(e) => setHashtagsText(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="post-product" className="block text-xs font-semibold text-[#29243B] mb-1.5 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-[#D93B52]" />
                        {lang === 'bn' ? 'পণ্য ট্যাগ করুন (ঐচ্ছিক)' : 'Tag Marketplace Product'}
                      </label>
                      <select
                        id="post-product"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
                      >
                        <option value="">{lang === 'bn' ? 'কোনো পণ্য নয়' : 'None'}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {lang === 'bn' ? p.titleBn : p.titleEn} ({formatBdt(p.priceBdt, lang)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-[#777486] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSponsored}
                      onChange={(e) => setIsSponsored(e.target.checked)}
                      className="rounded accent-[#E83F58]"
                    />
                    <span>
                      {lang === 'bn'
                        ? 'এটি একটি স্পনসর্ড বা অ্যাফিলিয়েট পার্টনারশিপ পোস্ট (স্পষ্টভাবে উল্লেখ থাকবে)'
                        : 'Disclose as Sponsored / Affiliate Partnership content'}
                    </span>
                  </label>
                </>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#E83F58] text-white text-sm font-semibold hover:bg-[#D6324B] transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquarePlus className="w-4 h-4" />
            {submitting
              ? lang === 'bn' ? 'প্রকাশ হচ্ছে...' : 'Publishing...'
              : lang === 'bn' ? 'পোস্ট প্রকাশ করুন' : 'Publish Story'}
          </button>
        </form>

        {/* Live RedNote-Style Card Preview */}
        <aside className="lg:col-span-5 space-y-3">
          <p className="text-xs font-semibold text-[#777486]">
            {lang === 'bn' ? 'লাইভ ডিসকভার কার্ড প্রিভিউ' : 'Live Card Preview'}
          </p>
          <div className="max-w-xs bg-white rounded-2xl overflow-hidden border border-[#ECEAF0] shadow-[0_6px_24px_rgba(41,36,59,0.08)]">
            <div className={`${type === 'short_video' ? 'aspect-[3/4]' : 'aspect-[4/3]'} bg-[#FFE3D9]/40 relative`}>
              {type === 'short_video' && uploadedVideoUrl ? (
                <video
                  src={uploadedVideoUrl}
                  poster={mediaPreview}
                  controls
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
              )}
              {type === 'short_video' && (
                <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#29243B]/80 text-white text-[11px]">
                  <Play className="w-3 h-3 fill-white" />
                  {videoDurationSec}s
                </span>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[#777486]">
                <span>{CATEGORY_LABELS[category]?.[lang] ?? category}</span>
                {isSponsored && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#D93B52] font-medium">Sponsored</span>
                  </>
                )}
              </div>
              <h3 className="text-sm font-semibold text-[#29243B] leading-snug">
                {title || (lang === 'bn' ? 'আপনার গল্পের শিরোনাম এখানে দেখাবে' : 'Your story title appears here')}
              </h3>
              <p className="text-xs text-[#777486] line-clamp-3">
                {caption || (lang === 'bn' ? 'বিস্তারিত বিবরণ...' : 'Story caption preview...')}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
