import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Baby,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  PackageCheck,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Tag,
  Truck,
} from 'lucide-react';
import { PostCard, type EnrichedPost } from '../components/PostCard';
import { PostDetailModal } from '../components/PostDetailModal';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { AGE_GROUPS, t } from '../i18n/translations';
import {
  calculateBabyAgeMonths,
  formatBdt,
  formatCount,
  getAgeGroupFromMonths,
  matchProductsForBaby,
  resolveVideoMedia,
} from '../lib/domain';
import type {
  AgeGroupKey,
  BabyProfile,
  BrandProfile,
  CampaignOffer,
  CategoryConfig,
  DoctorProfile,
  GuideArticle,
  ProductCollectionTag,
  ProductItem,
  SellerProfile,
} from '../types/platform';

const HERO_SLIDES = [
  {
    id: 'slide_1',
    eyebrowBn: 'Aloorai · বাংলাদেশ',
    eyebrowEn: 'ALOORAI · BANGLADESH',
    titleBn: 'মাতৃত্বের সবকিছু। এক জায়গায়।',
    titleEn: 'Everything for Motherhood. All in One Place.',
    subtitleBn:
      'নবজাতক থেকে বেড়ে ওঠা—বিশ্বস্ত শিশু পণ্য, অভিজ্ঞ চিকিৎসক, মায়েদের কমিউনিটি ও বেবি গ্রোথ ট্র্যাকার।',
    subtitleEn:
      'Curated mother & baby shopping, verified paediatric care, growth tracking, and an inspiring community of mothers.',
    ctaBn: 'শপ ব্রাউজ করুন',
    ctaEn: 'Shop Essentials',
    ctaTo: '/marketplace',
    secondaryBn: 'মায়েদের গল্প দেখুন',
    secondaryEn: 'Explore Community',
    secondaryTo: '/discover',
    image: '/src/assets/images/hero_mother_baby_campaign_1794929083239.jpg',
    bgClass: 'bg-[#FAF9F6]',
  },
  {
    id: 'slide_2',
    eyebrowBn: 'গরমের আরামদায়ক নবজাতক কালেকশন',
    eyebrowEn: 'BREATHABLE COTTON & NURSERY',
    titleBn: 'নবজাতকের ত্বকের জন্য ১০০% অর্গানিক মসলিন ও স্কিনকেয়ার',
    titleEn: 'Breathable Organic Muslin & Gentle Botanical Care',
    subtitleBn: 'ঢাকার আবহাওয়ার উপযোগী প্রাকৃতিক কটন সোয়াডল, বাম্বু ডায়াপার ও ক্যামোমাইল অয়েল।',
    subtitleEn: 'Pre-washed double-gauze swaddles, bamboo diapers, and dermatologist-tested baby oils.',
    ctaBn: 'নিউবর্ন কালেকশন',
    ctaEn: 'Shop Newborn (0–3m)',
    ctaTo: '/marketplace?age=newborn',
    secondaryBn: 'অফার দেখুন',
    secondaryEn: 'View Offers',
    secondaryTo: '/marketplace?offer=flash',
    image: '/src/assets/images/product_muslin_swaddle_1794921206420.jpg',
    bgClass: 'bg-[#FFE3D9]/35',
  },
  {
    id: 'slide_3',
    eyebrowBn: 'ম্যাটারনিটি ও প্রসব পরবর্তী যত্ন',
    eyebrowEn: 'PREGNANCY & POSTPARTUM CARE',
    titleBn: 'গর্ভাবস্থা ও নতুন মায়ের আরামদায়ক পোশাক ও হসপিটাল কিট',
    titleEn: 'Effortless Maternity Wear & Postpartum Care Kits',
    subtitleBn: 'নার্সিং-ফ্রেন্ডলি লিনেন ড্রেস ও মায়ের সুস্বাস্থ্যের সকল প্রয়োজনীয় অনুষঙ্গ।',
    subtitleEn: 'Nursing-friendly handloom dresses paired with curated postpartum recovery essentials.',
    ctaBn: 'মাদার কেয়ার শপ',
    ctaEn: 'Shop Mother Care',
    ctaTo: '/marketplace/categories/maternity_wear',
    secondaryBn: 'প্রেগন্যান্সি গাইড',
    secondaryEn: 'Pregnancy Guide',
    secondaryTo: '/pregnancy',
    image: '/src/assets/images/product_maternity_fashion_1794929084481.jpg',
    bgClass: 'bg-[#F3F0FE]/60',
  },
  {
    id: 'slide_4',
    eyebrowBn: 'ডাক্তার কর্নার ও বেবি ট্র্যাকার',
    eyebrowEn: 'DOCTOR CORNER & BABY TRACKER',
    titleBn: 'অভিজ্ঞ শিশু ও গাইনি বিশেষজ্ঞের পরামর্শ এবং টিকা ট্র্যাকার',
    titleEn: 'Paediatric Consultations & EPI Vaccine Tracker',
    subtitleBn: 'শিশুর ওজন-উচ্চতা লগ করুন এবং আপনার সন্তানের বয়স অনুযায়ী সঠিক পণ্যের সাজেশন পান।',
    subtitleEn: 'Track growth milestones, EPI vaccines, and book video consultations with specialists.',
    ctaBn: 'ডাক্তার খুঁজুন',
    ctaEn: 'Visit Doctor Corner',
    ctaTo: '/doctors',
    secondaryBn: 'বেবি ট্র্যাকার',
    secondaryEn: 'Open Baby Tracker',
    secondaryTo: '/baby-tracker',
    image: '/src/assets/images/doctor_female_specialist_1794921209359.jpg',
    bgClass: 'bg-[#EFF8F3]',
  },
];

export const HomePage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const [slideIdx, setSlideIdx] = useState(0);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOffer[]>([]);
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [videos, setVideos] = useState<EnrichedPost[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [guides, setGuides] = useState<GuideArticle[]>([]);
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [selectedBabyId, setSelectedBabyId] = useState<string>('');
  const [productTab, setProductTab] = useState<ProductCollectionTag | 'all'>('trending');
  const [selectedPost, setSelectedPost] = useState<EnrichedPost | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [prodRes, campRes, feedRes, vidRes, docRes, guideRes, babyRes] = await Promise.all([
        apiFetch<{
          products: ProductItem[];
          sellers: SellerProfile[];
          brands: BrandProfile[];
          categories: CategoryConfig[];
        }>('/api/v1/products'),
        apiFetch<{ campaigns: CampaignOffer[] }>('/api/v1/campaigns'),
        apiFetch<{ items: EnrichedPost[] }>('/api/v1/feed?tab=discover&limit=8'),
        apiFetch<{ items: EnrichedPost[] }>('/api/v1/feed?tab=videos&limit=6'),
        apiFetch<DoctorProfile[]>('/api/v1/doctors'),
        apiFetch<GuideArticle[]>('/api/v1/guides'),
        apiFetch<BabyProfile[]>('/api/v1/babies'),
      ]);
      setProducts(prodRes.products);
      setSellers(prodRes.sellers);
      setBrands(prodRes.brands);
      setCategories(prodRes.categories);
      setCampaigns(campRes.campaigns);
      setPosts(feedRes.items);
      setVideos(vidRes.items);
      setDoctors(docRes);
      setGuides(guideRes);
      setBabies(babyRes);
      if (babyRes[0]) setSelectedBabyId(babyRes[0].id);
    } catch {
      // Partial failures fall back smoothly
    }
  }, [apiFetch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeSlide = HERO_SLIDES[slideIdx];
  const activeBaby = babies.find((b) => b.id === selectedBabyId) ?? babies[0];
  const activeBabyMonths = activeBaby ? calculateBabyAgeMonths(activeBaby.dob) : 6;
  const activeBabyAgeKey = getAgeGroupFromMonths(activeBabyMonths);
  const personalizedProducts = matchProductsForBaby(products, activeBabyMonths).slice(0, 4);

  const tabbedProducts =
    productTab === 'all'
      ? products.slice(0, 8)
      : products.filter((p) => p.collectionTags?.includes(productTab)).slice(0, 4);
  const bestSellerProducts = products
    .filter((p) => p.collectionTags?.includes('best_seller'))
    .slice(0, 4);

  const handleToggleLike = async (postId: string) => {
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

  const handleToggleSave = async (postId: string) => {
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

  const handleFollow = async (authorId: string) => {
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

  return (
    <div className="flex flex-col gap-7 lg:block lg:space-y-14 pb-10 lg:pb-16">
      {/* MOBILE SECTION 1: COMPACT HERO CAMPAIGN & QUICK ACCESS CARDS */}
      <section className="lg:hidden order-1 px-3 pt-3 space-y-3">
        <div className="rounded-3xl bg-gradient-to-br from-[#FAF9F6] via-[#FFE3D9]/55 to-[#EDE5FF]/65 border border-[#ECEAF0] p-4 flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D93B52]">
              {lang === 'bn' ? 'Aloorai · বাংলাদেশ' : 'ALOORAI · BANGLADESH'}
            </p>
            <h1 className="text-lg font-semibold text-[#29243B] leading-snug">
              {lang === 'bn'
                ? 'গর্ভাবস্থা থেকে প্যারেন্টিং। সব এক জায়গায়।'
                : 'Pregnancy to Parenting. All in One Place.'}
            </h1>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <Link
                to="/marketplace"
                className="px-3.5 py-2 rounded-xl bg-[#FF6478] text-white text-xs font-semibold whitespace-nowrap"
              >
                {lang === 'bn' ? 'শপ করুন' : 'Shop Now'}
              </Link>
              <Link
                to="/videos"
                className="px-3 py-2 rounded-xl bg-white border border-[#ECEAF0] text-[#29243B] text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Play className="w-3 h-3 fill-[#29243B]" />
                {lang === 'bn' ? 'ভিডিও দেখুন' : 'Watch Reels'}
              </Link>
            </div>
          </div>
          <img
            src="/src/assets/images/hero_mother_baby_campaign_1794929083239.jpg"
            alt={lang === 'bn' ? 'গর্ভাবস্থা থেকে প্যারেন্টিং' : 'Pregnancy to Parenting'}
            className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-white shadow-xs"
          />
        </div>

        {/* Mobile Quick Access 4-Card Strip */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('mc:open-ai-companion'))}
            className="p-3 rounded-2xl bg-[#29243B] text-white flex items-center gap-2.5 text-left"
          >
            <span className="w-9 h-9 rounded-xl bg-[#FF6478] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold truncate">Ask Aloorai AI</span>
              <span className="block text-[10px] text-white/75 truncate">
                {lang === 'bn' ? 'শপিং ও কেয়ার সহায়ক' : 'Shopping & care'}
              </span>
            </span>
          </button>

          <Link
            to="/guide"
            className="p-3 rounded-2xl bg-[#EDE5FF]/65 border border-[#ECEAF0] text-[#29243B] flex items-center gap-2.5"
          >
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-[#29243B]" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold truncate">
                {lang === 'bn' ? 'মায়ের গাইড' : "Mother's Guide"}
              </span>
              <span className="block text-[10px] text-[#777486] truncate">
                {lang === 'bn' ? 'গর্ভাবস্থা ও যত্ন' : '9 expert topics'}
              </span>
            </span>
          </Link>

          <Link
            to="/baby-tracker"
            className="p-3 rounded-2xl bg-[#E0F3EA]/75 border border-[#B8DCCB] text-[#29243B] flex items-center gap-2.5"
          >
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
              <Baby className="w-4 h-4 text-[#1E5A40]" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold truncate">
                {lang === 'bn' ? 'বেবি ট্র্যাকার' : 'Baby Tracker'}
              </span>
              <span className="block text-[10px] text-[#1E5A40] truncate">
                {lang === 'bn' ? 'বৃদ্ধি ও টিকা' : 'Growth & vaccines'}
              </span>
            </span>
          </Link>

          <Link
            to="/doctors"
            className="p-3 rounded-2xl bg-white border border-[#ECEAF0] text-[#29243B] flex items-center gap-2.5"
          >
            <span className="w-9 h-9 rounded-xl bg-[#FFE3D9] flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4 text-[#D93B52]" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold truncate">
                {lang === 'bn' ? 'ডাক্তার খুঁজুন' : 'Find Doctors'}
              </span>
              <span className="block text-[10px] text-[#777486] truncate">
                {lang === 'bn' ? 'ভিডিও পরামর্শ' : 'Verified care'}
              </span>
            </span>
          </Link>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
          {(campaigns.length > 0 ? campaigns : HERO_SLIDES.slice(0, 3).map((s, idx) => ({
            id: s.id,
            type: 'flash' as const,
            titleEn: s.ctaEn,
            titleBn: s.ctaBn,
            subtitleEn: s.eyebrowEn,
            subtitleBn: s.eyebrowBn,
            badgeEn: idx === 0 ? 'Offer · WELCOME10' : 'Newborn Deal',
            badgeBn: idx === 0 ? 'অফার · WELCOME10' : 'নবজাতক অফার',
            imageUrl: s.image,
            productIds: [],
          }))).map((camp, idx) => (
            <Link
              key={camp.id}
              to={idx === 1 ? '/marketplace?age=newborn' : '/marketplace'}
              className={`min-w-[260px] max-w-[285px] shrink-0 rounded-2xl p-2.5 border border-[#ECEAF0] flex items-center gap-3 ${
                idx === 0 ? 'bg-[#FFE3D9]/65' : idx === 1 ? 'bg-[#EDE5FF]/80' : 'bg-[#E0F3EA]'
              }`}
            >
              <img
                src={camp.imageUrl}
                alt={lang === 'bn' ? camp.titleBn : camp.titleEn}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover shrink-0 bg-white"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#D93B52] truncate">
                  {lang === 'bn' ? camp.badgeBn : camp.badgeEn}
                </p>
                <p className="text-xs font-semibold text-[#29243B] line-clamp-2 leading-snug">
                  {lang === 'bn' ? camp.titleBn : camp.titleEn}
                </p>
                <span className="inline-block text-[11px] font-semibold text-[#29243B] underline">
                  {lang === 'bn' ? 'এখনই দেখুন →' : 'Shop Now →'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* DESKTOP SECTION 3: HERO CAROUSEL BANNER (hidden on mobile) */}
      <section className="hidden lg:block max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div
          className={`relative rounded-3xl overflow-hidden border border-[#ECEAF0] ${activeSlide.bgClass} transition-colors duration-300`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 space-y-5">
              <p className="text-xs font-semibold tracking-wider uppercase text-[#D93B52]">
                {lang === 'bn' ? activeSlide.eyebrowBn : activeSlide.eyebrowEn}
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold text-[#29243B] leading-[1.15]">
                {lang === 'bn' ? activeSlide.titleBn : activeSlide.titleEn}
              </h1>
              <p className="text-sm sm:text-base text-[#29243B]/75 max-w-xl leading-relaxed">
                {lang === 'bn' ? activeSlide.subtitleBn : activeSlide.subtitleEn}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to={activeSlide.ctaTo}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E83F58] hover:bg-[#D6324B] text-white text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  <span>{lang === 'bn' ? activeSlide.ctaBn : activeSlide.ctaEn}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={activeSlide.secondaryTo}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#ECEAF0] hover:border-[#B8A5F5] text-[#29243B] text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  {lang === 'bn' ? activeSlide.secondaryBn : activeSlide.secondaryEn}
                </Link>
              </div>

              {/* Carousel Controls */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSlideIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                  aria-label="Previous campaign slide"
                  className="w-8 h-8 rounded-full bg-white border border-[#ECEAF0] flex items-center justify-center hover:border-[#29243B]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {HERO_SLIDES.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlideIdx(idx)}
                      aria-label={`Slide ${idx + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        idx === slideIdx ? 'w-6 bg-[#E83F58]' : 'w-2 bg-[#29243B]/20'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSlideIdx((i) => (i + 1) % HERO_SLIDES.length)}
                  aria-label="Next campaign slide"
                  className="w-8 h-8 rounded-full bg-white border border-[#ECEAF0] flex items-center justify-center hover:border-[#29243B]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 h-64 sm:h-80 lg:h-[430px] relative overflow-hidden">
              <img
                src={activeSlide.image}
                alt={lang === 'bn' ? activeSlide.titleBn : activeSlide.titleEn}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 (Mobile #2): SHOP BY CATEGORY */}
      <section className="order-2 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 space-y-3 sm:space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-[#29243B]">
              {lang === 'bn' ? 'ক্যাটাগরি অনুযায়ী শপিং' : 'Shop by Category'}
            </h2>
            <p className="hidden sm:block text-xs sm:text-sm text-[#777486] mt-0.5">
              {lang === 'bn'
                ? 'মা ও শিশুর প্রয়োজনীয় ১২টি মূল বিভাগ থেকে বেছে নিন'
                : 'Explore curated essentials across 12 mother, baby & kids departments'}
            </p>
          </div>
          <Link to="/marketplace" className="text-xs sm:text-sm font-semibold text-[#D93B52] hover:underline whitespace-nowrap">
            {lang === 'bn' ? 'সবগুলো →' : 'View All →'}
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/marketplace/categories/${cat.slug}`}
              className="group bg-white rounded-2xl p-2 sm:p-3 border border-[#ECEAF0] hover:border-[#B8A5F5] hover:shadow-[0_8px_22px_rgba(41,36,59,0.06)] transition-all flex flex-col gap-1.5 sm:gap-2.5"
            >
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF9F6]">
                <img
                  src={cat.imageUrl}
                  alt={lang === 'bn' ? cat.nameBn : cat.nameEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                />
              </div>
              <p className="text-[11px] sm:text-sm font-semibold text-[#29243B] text-center line-clamp-1">
                {lang === 'bn' ? cat.nameBn : cat.nameEn}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 5 (Mobile #3): SHOP BY AGE */}
      <section className="order-3 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 space-y-3 sm:space-y-5">
        <div>
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-[#29243B]">
            {lang === 'bn' ? 'বয়স অনুযায়ী পণ্য খুঁজুন' : 'Shop by Age & Stage'}
          </h2>
          <p className="hidden sm:block text-xs sm:text-sm text-[#777486] mt-0.5">
            {lang === 'bn'
              ? 'গর্ভাবস্থা থেকে শুরু করে ৫+ বছর পর্যন্ত প্রতিটি ধাপের জন্য উপযুক্ত পণ্য'
              : 'Tailored collections from prenatal care through 5+ years'}
          </p>
        </div>

        <div className="flex lg:grid lg:grid-cols-7 gap-2.5 lg:gap-3 overflow-x-auto lg:overflow-visible no-scrollbar pb-1">
          {(Object.keys(AGE_GROUPS) as AgeGroupKey[]).map((key, idx) => {
            const meta = AGE_GROUPS[key];
            const tints = [
              'bg-[#FFE3D9]/55 border-[#FFE3D9]',
              'bg-[#F3F0FE] border-[#B8A5F5]/40',
              'bg-[#EFF8F3] border-[#B8DCCB]',
              'bg-white border-[#ECEAF0]',
              'bg-[#F3F0FE] border-[#B8A5F5]/40',
              'bg-[#FFE3D9]/55 border-[#FFE3D9]',
              'bg-[#EFF8F3] border-[#B8DCCB]',
            ];
            return (
              <Link
                key={key}
                to={`/marketplace?age=${key}`}
                className={`min-w-[112px] lg:min-w-0 shrink-0 rounded-2xl p-3 sm:p-4 border ${tints[idx % tints.length]} hover:border-[#29243B] transition-colors text-center space-y-0.5 sm:space-y-1`}
              >
                <p className="text-xs sm:text-sm font-semibold text-[#29243B] whitespace-nowrap">
                  {lang === 'bn' ? meta.bn : meta.en}
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-[#D93B52] whitespace-nowrap">
                  {lang === 'bn' ? meta.rangeBn : meta.rangeEn}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 6 (Mobile #11): PERSONALISED FOR YOUR BABY (Interactive Child Age Matching) */}
      <section className="order-11 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white border border-[#ECEAF0] p-6 sm:p-8 space-y-6 shadow-[0_6px_26px_rgba(41,36,59,0.04)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#1E5A40] flex items-center gap-1.5">
                <Baby className="w-4 h-4" />
                {lang === 'bn' ? 'আপনার শিশুর জন্য পার্সোনালাইজড' : 'Personalised For Your Baby'}
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#29243B]">
                {activeBaby
                  ? lang === 'bn'
                    ? `${activeBaby.name}-এর (${activeBabyMonths} মাস · ${AGE_GROUPS[activeBabyAgeKey].bn}) জন্য বাছাইকৃত`
                    : `Picked for ${activeBaby.name} (${activeBabyMonths} months · ${AGE_GROUPS[activeBabyAgeKey].en})`
                  : lang === 'bn'
                    ? 'আপনার শিশুর বয়স অনুযায়ী বাছাইকৃত পণ্য'
                    : 'Age-Matched Recommendations for Your Child'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {babies.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBabyId(b.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    b.id === activeBaby?.id
                      ? 'bg-[#29243B] text-white'
                      : 'bg-[#FAF9F6] border border-[#ECEAF0] text-[#29243B]'
                  }`}
                >
                  {b.name}
                </button>
              ))}
              <Link
                to="/baby-tracker"
                className="px-4 py-2 rounded-xl bg-[#EFF8F3] border border-[#B8DCCB] text-[#1E5A40] text-xs font-semibold hover:bg-[#B8DCCB]/40"
              >
                {lang === 'bn' ? 'গ্রোথ ও টিকা দেখুন →' : 'Track Growth & Vaccines →'}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {personalizedProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 (Mobile #4): TRENDING PRODUCTS (With Collection Tabs) */}
      <section className="order-4 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-[#29243B]">
                {lang === 'bn' ? 'জনপ্রিয় ও ট্রেন্ডিং পণ্য' : 'Trending Products'}
              </h2>
              <p className="hidden sm:block text-xs sm:text-sm text-[#777486] mt-0.5">
                {lang === 'bn'
                  ? 'মায়েদের সর্বাধিক পছন্দের ও রিভিউ করা পণ্যসমূহ'
                  : 'Best sellers, new arrivals, and mother-recommended favorites'}
              </p>
            </div>
            <Link to="/marketplace" className="lg:hidden text-xs font-semibold text-[#D93B52] whitespace-nowrap">
              {lang === 'bn' ? 'শপ →' : 'Shop All →'}
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'trending' as const, en: 'Trending', bn: 'ট্রেন্ডিং' },
              { id: 'best_seller' as const, en: 'Best Sellers', bn: 'বেস্ট সেলার' },
              { id: 'new_arrival' as const, en: 'New Arrivals', bn: 'নতুন পণ্য' },
              { id: 'recommended' as const, en: 'Recommended', bn: 'প্রস্তাবিত' },
              { id: 'all' as const, en: 'View All', bn: 'সবগুলো' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProductTab(tab.id)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  productTab === tab.id
                    ? 'bg-[#29243B] text-white'
                    : 'bg-white border border-[#ECEAF0] text-[#777486] hover:text-[#29243B]'
                }`}
              >
                {lang === 'bn' ? tab.bn : tab.en}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {tabbedProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      </section>

      {/* MOBILE SECTION #5: BEST SELLERS (Dedicated 2-Col Mobile Showcase) */}
      <section className="lg:hidden order-5 w-full max-w-[1440px] mx-auto px-3 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#29243B]">
            {lang === 'bn' ? 'সেরা বিক্রিত পণ্য' : 'Best Sellers'}
          </h2>
          <Link to="/marketplace" className="text-xs font-semibold text-[#D93B52] whitespace-nowrap">
            {lang === 'bn' ? 'সবগুলো →' : 'View All →'}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {bestSellerProducts.map((prod) => (
            <ProductCard key={`bs_${prod.id}`} product={prod} />
          ))}
        </div>
      </section>

      {/* SECTION 8 (Mobile #10): BRANDS WE LOVE */}
      <section className="order-10 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 space-y-3 sm:space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-[#29243B]">
              {lang === 'bn' ? 'আমাদের প্রিয় পার্টনার ব্র্যান্ড' : 'Featured Brands'}
            </h2>
            <p className="hidden sm:block text-xs sm:text-sm text-[#777486] mt-0.5">
              {lang === 'bn'
                ? 'নিরাপদ উপাদানে তৈরি নমুনা ও পার্টনার ব্র্যান্ডসমূহ'
                : 'Sample partner brands crafted for Bangladesh families'}
            </p>
          </div>
          <Link to="/brands" className="text-xs sm:text-sm font-semibold text-[#D93B52] hover:underline whitespace-nowrap">
            {lang === 'bn' ? 'সব ব্র্যান্ড →' : 'All Brands →'}
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/brands/${brand.slug}`}
              className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-[#ECEAF0] hover:border-[#B8A5F5] transition-all flex flex-col justify-between"
            >
              <div className="aspect-[16/9] bg-[#FAF9F6] overflow-hidden relative">
                <img
                  src={brand.bannerUrl}
                  alt={brand.nameEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <div className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
                <img
                  src={brand.logoUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl object-cover border border-[#ECEAF0] shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-[#29243B] truncate">
                    {lang === 'bn' ? brand.nameBn : brand.nameEn}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#777486] line-clamp-1">
                    {lang === 'bn' ? brand.taglineBn : brand.taglineEn}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 9 (Desktop Only — Mobile uses compact Section #1 strip): SPECIAL OFFERS */}
      <section className="hidden lg:block max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#29243B]">
            {lang === 'bn' ? 'বিশেষ অফার ও বান্ডেল' : 'Special Offers & Bundles'}
          </h2>
          <p className="text-xs sm:text-sm text-[#777486] mt-0.5">
            {lang === 'bn'
              ? 'চেকআউটে কুপন কোড ব্যবহার করে সরাসরি ছাড় উপভোগ করুন'
              : 'Apply verified coupon codes at checkout for instant BDT savings'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {campaigns.map((camp, idx) => (
            <div
              key={camp.id}
              className={`rounded-3xl overflow-hidden border border-[#ECEAF0] flex flex-col justify-between ${
                idx === 0 ? 'bg-[#FFE3D9]/40' : idx === 1 ? 'bg-[#F3F0FE]/70' : 'bg-[#EFF8F3]'
              }`}
            >
              <div className="p-6 space-y-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D93B52]">
                  <Tag className="w-3.5 h-3.5" />
                  {lang === 'bn' ? camp.badgeBn : camp.badgeEn}
                </span>
                <h3 className="text-lg font-semibold text-[#29243B]">
                  {lang === 'bn' ? camp.titleBn : camp.titleEn}
                </h3>
                <p className="text-xs text-[#29243B]/75 leading-relaxed">
                  {lang === 'bn' ? camp.subtitleBn : camp.subtitleEn}
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    to="/marketplace"
                    className="px-4 py-2 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
                  >
                    {lang === 'bn' ? 'অফার দেখুন' : 'Shop Offer'}
                  </Link>
                  {camp.couponCode && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(camp.couponCode!).catch(() => {});
                        showToast(`Copied coupon ${camp.couponCode}`);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECEAF0] text-xs font-mono-num font-semibold text-[#29243B]"
                    >
                      {camp.couponCode}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 10 (Mobile #6): DISCOVER FROM MOTHERS */}
      <section className="order-6 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 space-y-3 sm:space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#845EF7] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'bn' ? 'মায়েদের সামাজিক কমিউনিটি' : 'Social Discovery Feed'}
            </p>
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-[#29243B] mt-0.5">
              {lang === 'bn' ? 'মায়েদের অভিজ্ঞতা ও রিভিউ' : 'Discover From Mothers'}
            </h2>
          </div>
          <Link to="/community" className="text-xs sm:text-sm font-semibold text-[#D93B52] hover:underline whitespace-nowrap">
            {lang === 'bn' ? 'কমিউনিটি আলোচনা →' : 'Community Discussions →'}
          </Link>
        </div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4">
          {posts.slice(0, 6).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpen={setSelectedPost}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      </section>

      {/* SECTION 11 (Mobile #7): PARENTING VIDEOS CAROUSEL */}
      <section className="order-7 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 space-y-3 sm:space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-[#29243B]">
              {lang === 'bn' ? 'প্যারেন্টিং ও প্রোডাক্ট ভিডিও' : 'Parenting Videos'}
            </h2>
            <p className="hidden sm:block text-xs sm:text-sm text-[#777486] mt-0.5">
              {lang === 'bn'
                ? 'খাবার রেসিপি, ডাক্তারদের টিপস ও পণ্যের ডেমো দেখুন'
                : 'Vertical reels with baby nutrition recipes, doctor advice & shoppable product tags'}
            </p>
          </div>
          <Link to="/videos" className="text-xs sm:text-sm font-semibold text-[#D93B52] hover:underline whitespace-nowrap">
            {lang === 'bn' ? 'সব ভিডিও →' : 'Watch Reels →'}
          </Link>
        </div>

        <div className="flex lg:grid lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible no-scrollbar pb-1">
          {videos.slice(0, 4).map((vid) => {
            const { posterSrc } = resolveVideoMedia(vid.mediaUrls);
            const dur = vid.videoDurationSec
              ? `${Math.floor(vid.videoDurationSec / 60)}:${String(vid.videoDurationSec % 60).padStart(2, '0')}`
              : '0:45';
            return (
              <Link
                key={vid.id}
                to={`/videos?v=${vid.id}`}
                className="group relative min-w-[152px] sm:min-w-[190px] lg:min-w-0 shrink-0 aspect-[9/14] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#29243B] border border-[#ECEAF0]"
              >
                <img
                  src={posterSrc}
                  alt={lang === 'bn' ? vid.titleBn : vid.titleEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#29243B]/85 via-transparent to-transparent" />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-[#29243B]/75 text-white text-[10px] font-semibold tabular-nums">
                  {dur}
                </span>
                <span className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 text-[#29243B] flex items-center justify-center shadow-sm">
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#29243B]" />
                </span>
                <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3 sm:left-3 sm:right-3 text-white space-y-0.5 sm:space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-white/80 font-medium truncate">
                    {vid.authorName} · {formatCount(vid.viewsCount, lang)} views
                  </p>
                  <p className="text-xs sm:text-sm font-semibold line-clamp-2">
                    {lang === 'bn' ? vid.titleBn : vid.titleEn}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 12 (Mobile #8): DOCTOR CORNER */}
      <section className="order-8 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#EFF8F3] border border-[#B8DCCB] p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#1E5A40] flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" />
                {lang === 'bn' ? 'বিশেষজ্ঞ চিকিৎসক কর্নার' : 'Doctor Corner · Maternal & Paediatric Care'}
              </p>
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-[#29243B]">
                {lang === 'bn' ? 'শিশু ও গাইনি বিশেষজ্ঞদের পরামর্শ' : 'Consult Maternal & Child Specialists'}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/doctors"
                className="px-4 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#1E5A40] text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                {t(lang, 'bookAppointment')}
              </Link>
              <Link
                to="/community"
                className="px-4 py-2.5 rounded-xl bg-white border border-[#B8DCCB] text-[#1E5A40] text-xs font-semibold"
              >
                {lang === 'bn' ? 'ডাক্তারকে প্রশ্ন করুন' : 'Ask a Doctor'}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctors.slice(0, 3).map((doc) => (
              <Link
                key={doc.id}
                to={`/doctors/${doc.id}`}
                className="bg-white rounded-2xl p-4 border border-[#B8DCCB]/70 hover:border-[#1E5A40] transition-colors flex items-center gap-3.5"
              >
                <img
                  src={doc.avatarUrl}
                  alt={doc.nameEn}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover shrink-0 bg-[#EFF8F3]"
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-[#29243B] truncate">
                    {lang === 'bn' ? doc.nameBn : doc.nameEn}
                  </p>
                  <p className="text-xs font-medium text-[#1E5A40]">{doc.specialisation}</p>
                  <p className="text-xs text-[#777486] tabular-nums">
                    {formatBdt(doc.consultationFeeBdt, lang)} · {doc.isVerified ? t(lang, 'verifiedDoctor') : 'Demo Profile'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 13 (Mobile #9): PARENTING & MOTHER'S GUIDE */}
      <section className="order-9 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 space-y-3 sm:space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-[#29243B]">
              {lang === 'bn' ? 'প্যারেন্টিং ও মায়ের গাইড' : "Mother's Guide"}
            </h2>
            <p className="hidden sm:block text-xs sm:text-sm text-[#777486] mt-0.5">
              {lang === 'bn'
                ? 'বাংলা ও ইংরেজিতে গর্ভাবস্থা, নবজাতকের যত্ন এবং শিশুর বিকাশ বিষয়ক প্রবন্ধ'
                : 'Evidence-informed bilingual guides on pregnancy, baby sleep, nutrition & milestones'}
            </p>
          </div>
          <Link to="/guide" className="text-xs sm:text-sm font-semibold text-[#D93B52] hover:underline whitespace-nowrap">
            {lang === 'bn' ? 'সব গাইড →' : 'All Guides →'}
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {guides.slice(0, 4).map((g) => (
            <Link
              key={g.id}
              to={`/${g.category.replace('_', '-')}`}
              className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-[#ECEAF0] hover:border-[#B8A5F5] transition-all flex flex-col justify-between"
            >
              <div className="aspect-[16/10] bg-[#FAF9F6] overflow-hidden">
                <img
                  src={g.imageUrl}
                  alt={g.titleEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <div className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#1E5A40] flex items-center gap-1 truncate">
                    <BookOpen className="w-3 h-3 shrink-0" />
                    <span className="truncate">{g.isMedicallyReviewed ? t(lang, 'medicallyReviewed') : t(lang, 'unreviewedDraft')}</span>
                  </p>
                  <h3 className="text-xs sm:text-sm font-semibold text-[#29243B] line-clamp-2">
                    {lang === 'bn' ? g.titleBn : g.titleEn}
                  </h3>
                </div>
                <p className="hidden sm:block text-xs text-[#777486] line-clamp-2">{lang === 'bn' ? g.summaryBn : g.summaryEn}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 14 (Desktop): FEATURED SELLERS */}
      <section className="hidden lg:block max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#29243B]">
              {lang === 'bn' ? 'পার্টনার সেলার ও স্টোরসমূহ' : 'Featured Marketplace Sellers'}
            </h2>
            <p className="text-xs sm:text-sm text-[#777486] mt-0.5">
              {lang === 'bn'
                ? 'বাংলাদেশের যাচাইকৃত ও নমুনা বেবি কেয়ার শপগুলো ভিজিট করুন'
                : 'Explore verified & sample partner shops across Dhaka and Chattogram'}
            </p>
          </div>
          <Link
            to="/seller/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] hover:border-[#29243B] text-xs font-semibold text-[#29243B] whitespace-nowrap"
          >
            <Store className="w-3.5 h-3.5 text-[#D93B52]" />
            {lang === 'bn' ? 'সেলার হিসেবে নিবন্ধন করুন' : 'Become a Seller'}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sellers.slice(0, 3).map((s) => (
            <Link
              key={s.id}
              to={`/shops/${s.shopSlug}`}
              className="bg-white rounded-2xl p-5 border border-[#ECEAF0] hover:border-[#B8A5F5] transition-colors flex items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold text-[#29243B] truncate">{s.shopName}</p>
                <p className="text-xs text-[#777486]">
                  {s.district} · {s.businessType || 'Baby Essentials'}
                </p>
                <p className="text-xs font-medium text-[#29243B] inline-flex items-center gap-1 tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-[#FF6478] text-[#FF6478]" />
                  {s.rating} · {formatCount(s.followersCount, lang)} followers
                </p>
              </div>
              <span className="text-xs font-semibold text-[#D93B52] shrink-0">Visit Shop →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 15: CUSTOMER TRUST STRIP */}
      <section className="order-12 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: PackageCheck,
              titleBn: 'নিরাপদ ও যাচাইকৃত পণ্য',
              titleEn: 'Curated Authentic Goods',
              descBn: 'মা ও শিশুর ত্বকের জন্য নিরাপদ এবং মানসম্মত উপাদান।',
              descEn: 'BPA-free feeding, organic cotton & vetted local sellers.',
            },
            {
              icon: ShieldCheck,
              titleBn: 'চিকিৎসক ও কমিউনিটি রিভিউ',
              titleEn: 'Doctor & Mother Vetted',
              descBn: 'ডাক্তার কর্নারের নির্দেশিকা ও মায়েদের আসল অভিজ্ঞতা।',
              descEn: 'Medically reviewed guides & real reviews from Bangladesh mothers.',
            },
            {
              icon: Truck,
              titleBn: 'সারাদেশে দ্রুত ডেলিভারি',
              titleEn: '64-District Delivery',
              descBn: 'ঢাকায় ৳৬০ এবং সারাদেশে কুরিয়ার ট্র্যাকিং ও ক্যাশ অন ডেলিভারি।',
              descEn: 'Dhaka ৳60, nationwide courier & Cash on Delivery.',
            },
            {
              icon: HeartHandshake,
              titleBn: 'সহজ রিটার্ন ও সাপোর্ট',
              titleEn: 'Easy Return & Support',
              descBn: 'সমস্যা হলে সরাসরি অ্যাকাউন্ট থেকে রিটার্ন ও সাপোর্ট টিকেট।',
              descEn: 'Track orders and submit return or refund tickets in-app.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.titleEn} className="bg-white rounded-2xl p-5 border border-[#ECEAF0] space-y-2">
                <span className="w-9 h-9 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#D93B52]" />
                </span>
                <h3 className="text-sm font-semibold text-[#29243B]">
                  {lang === 'bn' ? item.titleBn : item.titleEn}
                </h3>
                <p className="text-xs text-[#777486] leading-relaxed">
                  {lang === 'bn' ? item.descBn : item.descEn}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onLike={handleToggleLike}
        onSave={handleToggleSave}
        onFollow={handleFollow}
        onBlock={() => setSelectedPost(null)}
      />
    </div>
  );
};
