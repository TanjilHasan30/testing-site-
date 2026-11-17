import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Baby,
  Bell,
  BookOpen,
  ChevronDown,
  Compass,
  Film,
  Globe,
  Heart,
  HelpCircle,
  Images,
  ListChecks,
  Mail,
  MessageCircle,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AGE_GROUPS, MARKETPLACE_CATEGORIES, t } from '../i18n/translations';
import { formatCount } from '../lib/domain';
import type { CategoryConfig } from '../types/platform';
import { AICompanion } from './AICompanion';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';

export const BrandLogo: React.FC<{ inverted?: boolean; compact?: boolean }> = ({
  inverted = false,
  compact = false,
}) => (
  <span className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0">
    <img
      src="/icon.svg"
      alt=""
      className={`${compact ? 'w-6 h-6' : 'w-7 h-7 sm:w-8 sm:h-8'} rounded-xl shrink-0 ${
        inverted ? 'ring-1 ring-white/35 shadow-sm' : ''
      }`}
    />
    <span
      className={`font-display ${compact ? 'text-[14px]' : 'text-[15px] sm:text-base xl:text-lg'} font-bold tracking-tight ${
        inverted ? 'text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)]' : 'text-[#29243B]'
      }`}
    >
      Aloorai
    </span>
  </span>
);

const CREATION_OPTIONS = [
  {
    to: '/create/video',
    icon: Film,
    en: 'Upload Video',
    bn: 'ভিডিও আপলোড',
    descEn: 'Vertical reel up to 3 minutes',
    descBn: 'সর্বোচ্চ ৩ মিনিটের ভার্টিক্যাল ভিডিও',
    tint: 'bg-[#FF6478]/15 text-[#D93B52]',
  },
  {
    to: '/create/photo',
    icon: Images,
    en: 'Photo Post',
    bn: 'ছবির পোস্ট',
    descEn: 'Share a warm moment or nursery snapshot',
    descBn: 'সুন্দর মুহূর্ত বা নার্সারির ছবি শেয়ার করুন',
    tint: 'bg-[#FFE3D9] text-[#29243B]',
  },
  {
    to: '/create/question',
    icon: HelpCircle,
    en: 'Ask Question',
    bn: 'প্রশ্ন করুন',
    descEn: 'Get advice from mothers & doctors',
    descBn: 'মায়েদের ও ডাক্তারদের পরামর্শ নিন',
    tint: 'bg-[#E0F3EA] text-[#1E5A40]',
  },
  {
    to: '/create/poll',
    icon: ListChecks,
    en: 'Create Poll',
    bn: 'পোল তৈরি করুন',
    descEn: 'Spark a community vote',
    descBn: 'কমিউনিটির মতামত জানুন',
    tint: 'bg-[#EDE5FF] text-[#29243B]',
  },
  {
    to: '/create?mode=review',
    icon: Star,
    en: 'Product Review',
    bn: 'পণ্য রিভিউ',
    descEn: 'Tag and review baby essentials',
    descBn: 'বেবি প্রোডাক্ট ট্যাগ করে রিভিউ দিন',
    tint: 'bg-[#E0F3EA] text-[#1E5A40]',
  },
];

type MegaMenuKey = 'shop' | 'mother' | 'baby' | null;

export const LayoutShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    lang,
    toggleLang,
    cart,
    wishlistIds,
    unreadNotifications,
    firebaseUser,
    viewerName,
    signInWithGoogle,
    signOutUser,
    apiFetch,
    showToast,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [megaMenu, setMegaMenu] = useState<MegaMenuKey>(null);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false
  );
  const headerRef = useRef<HTMLElement>(null);
  const hoverOpenedAtRef = useRef<number>(0);

  const isMobileVideoRoute = isMobileViewport && (location.pathname === '/' || location.pathname === '/videos');
  const activeVideoTab = (searchParams.get('tab') as 'for_you' | 'following' | 'trending' | null) || 'for_you';
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setMegaMenu(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const loadCats = () => {
      apiFetch<CategoryConfig[]>('/api/v1/categories')
        .then((cats) => setCategories(Array.isArray(cats) ? cats : []))
        .catch(() => {});
    };
    loadCats();
    window.addEventListener('mc:categories-updated', loadCats);
    return () => window.removeEventListener('mc:categories-updated', loadCats);
  }, [apiFetch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMegaMenu(null);
        setDrawerOpen(false);
        setCreateDrawerOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMegaMenu(null);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    try {
      await apiFetch('/api/v1/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail.trim(), lang }),
      });
      setNewsletterDone(true);
      setNewsletterEmail('');
      showToast(
        lang === 'bn'
          ? 'নিউজলেটার সাবস্ক্রিপশন সম্পন্ন হয়েছে!'
          : 'Subscribed to Aloorai updates!'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Subscription failed');
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative py-1.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
      isActive ? 'text-[#29243B] font-semibold' : 'text-[#777486] hover:text-[#29243B]'
    }`;

  const renderNavItem = (to: string, label: string, end = false) => (
    <NavLink key={to} to={to} end={end} className={navLinkClass}>
      {({ isActive }) => (
        <>
          <span>{label}</span>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 right-0 -bottom-[13px] h-[2.5px] rounded-full bg-[#E83F58]"
            />
          )}
        </>
      )}
    </NavLink>
  );

  const dynamicShopCategories =
    categories.length > 0
      ? categories
      : Object.entries(MARKETPLACE_CATEGORIES)
          .filter(([k]) => k !== 'all')
          .map(([slug, labels]) => ({
            slug,
            nameEn: labels.en,
            nameBn: labels.bn,
            imageUrl: '',
            subCategories: [],
            isActive: true,
          }));

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#29243B] overflow-x-hidden">
      {/* Slim Desktop Announcement Bar (hidden on mobile to preserve <=15% sticky viewport budget) */}
      <div className="hidden lg:block bg-[#29243B] text-[#FAF9F6] text-xs py-1.5 px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <p className="truncate">
            {lang === 'bn'
              ? '৳২,৫০০+ অর্ডারে সারাদেশে ফ্রি ডেলিভারি · WELCOME10 কোডে ১০% ছাড়'
              : 'Free nationwide delivery on orders ৳2,500+ · Use code WELCOME10 for 10% off'}
          </p>
          <div className="flex items-center gap-4 shrink-0 text-[#FAF9F6]/85">
            <Link to="/seller/register" className="hover:text-[#FF6478] transition-colors whitespace-nowrap">
              {lang === 'bn' ? 'সেলার হিসেবে যোগ দিন' : 'Sell on Aloorai'}
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/support" className="hover:text-[#FF6478] transition-colors whitespace-nowrap">
              {lang === 'bn' ? 'সহায়তা ও রিটার্ন' : 'Help & Returns'}
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky Header + Mega Menu (Transparent Instagram Reels overlay on mobile video route) */}
      <header
        ref={headerRef}
        onMouseLeave={() => setMegaMenu(null)}
        className={
          isMobileVideoRoute
            ? 'fixed top-0 inset-x-0 z-40 bg-gradient-to-b from-[#29243B]/75 via-[#29243B]/30 to-transparent border-b-0 lg:sticky lg:bg-white/95 lg:bg-none lg:backdrop-blur-md lg:border-b lg:border-[#ECEAF0]'
            : 'sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#ECEAF0]'
        }
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 h-[52px] lg:h-[60px] flex items-center justify-between gap-1.5 sm:gap-2">
          {/* LEFT: Brand Logo -> Direct Home Navigation on Mobile */}
          <Link
            to={isMobileViewport ? '/home' : '/'}
            aria-label="Aloorai Home"
            className="shrink-0 rounded-xl active:scale-95 transition-transform"
          >
            <BrandLogo inverted={isMobileVideoRoute} compact={isMobileVideoRoute} />
          </Link>

          {/* CENTER (Mobile Video Overlay): For You | Following | Trending */}
          {isMobileVideoRoute && (
            <div
              className="lg:hidden flex items-center justify-center gap-2.5 sm:gap-3.5 min-w-0"
              role="tablist"
              aria-label="Video feed tabs"
            >
              {[
                { id: 'for_you' as const, en: 'For You', bn: 'আপনার জন্য' },
                { id: 'following' as const, en: 'Following', bn: 'অনুসরণ' },
                { id: 'trending' as const, en: 'Trending', bn: 'ট্রেন্ডিং' },
              ].map((tabItem) => {
                const active = activeVideoTab === tabItem.id;
                return (
                  <button
                    key={tabItem.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          next.set('tab', tabItem.id);
                          return next;
                        },
                        { replace: true }
                      );
                    }}
                    className={`relative pb-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] ${
                      active ? 'text-white' : 'text-white/75 hover:text-white'
                    }`}
                  >
                    <span>{lang === 'bn' ? tabItem.bn : tabItem.en}</span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#FF6478]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* CENTER: Primary Navigation with Mega Menus */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-4 xl:gap-5">
            {renderNavItem('/', t(lang, 'navHome'), true)}

            <button
              type="button"
              onMouseEnter={() => {
                hoverOpenedAtRef.current = Date.now();
                setMegaMenu('shop');
              }}
              onClick={() => {
                setMegaMenu((m) => {
                  if (m === 'shop' && Date.now() - hoverOpenedAtRef.current < 600) return 'shop';
                  return m === 'shop' ? null : 'shop';
                });
              }}
              aria-expanded={megaMenu === 'shop'}
              className={`inline-flex items-center gap-1 py-1.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                megaMenu === 'shop' || location.pathname.startsWith('/marketplace')
                  ? 'text-[#29243B] font-semibold'
                  : 'text-[#777486] hover:text-[#29243B]'
              }`}
            >
              <span>{t(lang, 'navShop')}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {renderNavItem('/community', t(lang, 'navCommunity'))}
            {renderNavItem('/videos', t(lang, 'navVideos'))}

            <button
              type="button"
              onMouseEnter={() => {
                hoverOpenedAtRef.current = Date.now();
                setMegaMenu('mother');
              }}
              onClick={() => {
                setMegaMenu((m) => {
                  if (m === 'mother' && Date.now() - hoverOpenedAtRef.current < 600) return 'mother';
                  return m === 'mother' ? null : 'mother';
                });
              }}
              aria-expanded={megaMenu === 'mother'}
              className={`inline-flex items-center gap-1 py-1.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                megaMenu === 'mother' || location.pathname === '/mother-care'
                  ? 'text-[#29243B] font-semibold'
                  : 'text-[#777486] hover:text-[#29243B]'
              }`}
            >
              <span>{t(lang, 'navMotherCare')}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onMouseEnter={() => {
                hoverOpenedAtRef.current = Date.now();
                setMegaMenu('baby');
              }}
              onClick={() => {
                setMegaMenu((m) => {
                  if (m === 'baby' && Date.now() - hoverOpenedAtRef.current < 600) return 'baby';
                  return m === 'baby' ? null : 'baby';
                });
              }}
              aria-expanded={megaMenu === 'baby'}
              className={`inline-flex items-center gap-1 py-1.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                megaMenu === 'baby' || location.pathname === '/baby-tracker'
                  ? 'text-[#29243B] font-semibold'
                  : 'text-[#777486] hover:text-[#29243B]'
              }`}
            >
              <span>{t(lang, 'navBabyKids')}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {renderNavItem('/doctors', t(lang, 'navDoctors'))}
            {renderNavItem('/guide', t(lang, 'navParenting'))}
          </nav>

          {/* RIGHT: Search, Language, Wishlist, Notifications, Cart, Create, Account */}
          <div className="flex items-center gap-1.5 shrink-0">
            <form onSubmit={handleSearch} className="hidden 2xl:flex items-center relative">
              <Search className="w-3.5 h-3.5 text-[#777486] absolute left-3 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t(lang, 'searchPlaceholder')}
                aria-label={t(lang, 'searchPlaceholder')}
                className="w-44 pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#ECEAF0] rounded-xl text-[#29243B] placeholder:text-[#777486] focus:outline-none focus:border-[#B8A5F5]"
              />
            </form>

            <Link
              to="/search"
              aria-label="Search"
              className={`2xl:hidden inline-flex items-center justify-center ${
                isMobileVideoRoute
                  ? 'w-8 h-8 rounded-full text-white hover:bg-white/15 drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)]'
                  : 'w-9 h-9 rounded-xl text-[#29243B]/80 hover:bg-[#FAF9F6] border border-transparent hover:border-[#ECEAF0]'
              } shrink-0 transition-colors`}
            >
              <Search className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={toggleLang}
              aria-label="Switch language between Bengali and English"
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#ECEAF0] bg-[#FAF9F6] text-xs font-semibold text-[#29243B] hover:border-[#B8A5F5] transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
            >
              <Globe className="w-3.5 h-3.5 text-[#D93B52]" />
              <span>{lang === 'bn' ? 'বাংলা' : 'EN'}</span>
            </button>

            <Link
              to="/wishlist"
              aria-label={t(lang, 'wishlist')}
              className="relative hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-[#29243B]/85 hover:border-[#B8A5F5] shrink-0"
            >
              <Heart className="w-4 h-4" />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#B8A5F5] text-[#29243B] text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {formatCount(wishlistIds.length, lang)}
                </span>
              )}
            </Link>

            <Link
              to="/notifications"
              aria-label={t(lang, 'notifications')}
              className={`${
                isMobileVideoRoute ? 'hidden lg:inline-flex' : 'inline-flex'
              } relative items-center justify-center w-9 h-9 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-[#29243B]/85 hover:border-[#B8A5F5] shrink-0`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E83F58] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {formatCount(unreadNotifications, lang)}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              aria-label={t(lang, 'cart')}
              className="relative hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-[#29243B]/85 hover:border-[#B8A5F5] shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#29243B] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {formatCount(cartCount, lang)}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setCreateDrawerOpen(true)}
              aria-label={t(lang, 'createPost')}
              className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E83F58] text-white text-xs font-semibold hover:bg-[#D6324B] transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t(lang, 'createPost')}</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open profile & workspace menu"
              className={`inline-flex items-center justify-center ${
                isMobileVideoRoute
                  ? 'w-8 h-8 border-2 border-white/80 bg-[#29243B]/45 text-white'
                  : 'w-9 h-9 border-2 border-[#B8A5F5]/60 hover:border-[#FF6478] bg-[#FFE3D9] text-[#29243B]'
              } rounded-full overflow-hidden transition-colors shrink-0`}
            >
              {firebaseUser?.photoURL ? (
                <img src={firebaseUser.photoURL} alt={viewerName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Desktop Mega Menu Panel */}
        {megaMenu && (
          <div className="hidden lg:block absolute left-0 right-0 top-full bg-white border-b border-[#ECEAF0] shadow-[0_20px_48px_rgba(41,36,59,0.12)] z-40">
            <div className="max-w-[1440px] mx-auto px-8 py-6">
              {megaMenu === 'shop' && (
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#777486]">
                        {lang === 'bn' ? 'সব শপ ক্যাটাগরি' : 'All Shop Categories'}
                      </p>
                      <Link
                        to="/marketplace"
                        onClick={() => setMegaMenu(null)}
                        className="text-xs font-semibold text-[#D93B52] hover:underline"
                      >
                        {lang === 'bn' ? 'সব পণ্য দেখুন →' : 'View All Products →'}
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {dynamicShopCategories.map((cat) => (
                        <Link
                          key={cat.slug}
                          to={`/marketplace/categories/${cat.slug}`}
                          onClick={() => setMegaMenu(null)}
                          className="p-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F3F0FE] border border-transparent hover:border-[#B8A5F5] transition-colors flex flex-col justify-center"
                        >
                          <span className="text-xs font-semibold text-[#29243B]">
                            {lang === 'bn' ? cat.nameBn : cat.nameEn}
                          </span>
                          {cat.subCategories.length > 0 && (
                            <span className="text-[11px] text-[#777486] truncate mt-0.5">
                              {cat.subCategories.slice(0, 2).join(' · ')}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-4 bg-[#FAF9F6] rounded-2xl p-5 border border-[#ECEAF0] space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777486]">
                      {lang === 'bn' ? 'বিশেষ সংগ্রহ ও পার্টনার' : 'Featured & Partners'}
                    </p>
                    <div className="space-y-2 text-xs">
                      <Link
                        to="/brands"
                        onClick={() => setMegaMenu(null)}
                        className="block font-semibold text-[#29243B] hover:text-[#D93B52]"
                      >
                        {lang === 'bn' ? 'জনপ্রিয় ব্র্যান্ডসমূহ →' : 'Brands We Love →'}
                      </Link>
                      <Link
                        to="/marketplace?offer=flash"
                        onClick={() => setMegaMenu(null)}
                        className="block font-semibold text-[#D93B52] hover:underline"
                      >
                        {lang === 'bn' ? 'বিশেষ অফার ও বান্ডেল ডিল →' : 'Special Offers & Bundles →'}
                      </Link>
                      <Link
                        to="/seller/register"
                        onClick={() => setMegaMenu(null)}
                        className="block font-semibold text-[#1E5A40] hover:underline"
                      >
                        {lang === 'bn' ? 'আমাদের সাথে বিক্রি করুন →' : 'Become a Verified Seller →'}
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {megaMenu === 'mother' && (
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        to: '/pregnancy',
                        titleBn: 'গর্ভাবস্থা যত্ন',
                        titleEn: 'Pregnancy Care',
                        descBn: 'ত্রৈমাসিক গাইড ও পুষ্টি',
                        descEn: 'Trimester guides & nutrition',
                      },
                      {
                        to: '/marketplace/categories/maternity_wear',
                        titleBn: 'ম্যাটারনিটি পোশাক',
                        titleEn: 'Maternity Wear',
                        descBn: 'আরামদায়ক সুতি ও নার্সিং ড্রেস',
                        descEn: 'Breathable cotton & nursing',
                      },
                      {
                        to: '/marketplace/categories/mother_care',
                        titleBn: 'মায়ের যত্ন ও প্রসব পরবর্তী',
                        titleEn: 'Postpartum & Nursing',
                        descBn: 'হসপিটাল ব্যাগ ও কেয়ার কিট',
                        descEn: 'Recovery & lactation kits',
                      },
                      {
                        to: '/doctors',
                        titleBn: 'গাইনি ও পুষ্টি পরামর্শ',
                        titleEn: 'Gynae & Nutrition Care',
                        descBn: 'ভিডিও বা ক্লিনিক বুকিং',
                        descEn: 'Book specialist consultation',
                      },
                    ].map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMegaMenu(null)}
                        className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] hover:border-[#B8A5F5] transition-colors space-y-1"
                      >
                        <p className="text-sm font-semibold text-[#29243B]">
                          {lang === 'bn' ? item.titleBn : item.titleEn}
                        </p>
                        <p className="text-xs text-[#777486]">
                          {lang === 'bn' ? item.descBn : item.descEn}
                        </p>
                      </Link>
                    ))}
                  </div>
                  <div className="col-span-4 rounded-2xl bg-[#EFF8F3] border border-[#B8DCCB] p-5 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#1E5A40]">
                        {lang === 'bn' ? 'মাতৃস্বাস্থ্য ও ডাক্তার কর্নার' : 'Maternal Health Support'}
                      </p>
                      <p className="text-sm font-semibold text-[#29243B] mt-1">
                        {lang === 'bn'
                          ? 'গর্ভাবস্থা বা প্রসব পরবর্তী যেকোনো প্রশ্ন কমিউনিটি ও চিকিৎসকদের জিজ্ঞাসা করুন।'
                          : 'Ask anonymous maternal health questions or schedule a doctor consultation.'}
                      </p>
                    </div>
                    <Link
                      to="/mother-care"
                      onClick={() => setMegaMenu(null)}
                      className="inline-block mt-3 text-xs font-semibold text-[#1E5A40] hover:underline"
                    >
                      {lang === 'bn' ? 'মায়ের গাইড পড়ুন →' : 'Read Mother Care Guides →'}
                    </Link>
                  </div>
                </div>
              )}

              {megaMenu === 'baby' && (
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777486]">
                      {lang === 'bn' ? 'বয়স অনুযায়ী বেবি ও কিডস শপ' : 'Shop Baby & Kids by Age Stage'}
                    </p>
                    <div className="grid grid-cols-5 gap-2.5">
                      {(['newborn', 'infant', 'toddler', 'preschool', 'kids'] as const).map((ageKey) => (
                        <Link
                          key={ageKey}
                          to={`/marketplace?age=${ageKey}`}
                          onClick={() => setMegaMenu(null)}
                          className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] hover:border-[#FF6478] text-center space-y-1 transition-colors"
                        >
                          <p className="text-sm font-semibold text-[#29243B]">
                            {lang === 'bn' ? AGE_GROUPS[ageKey].bn : AGE_GROUPS[ageKey].en}
                          </p>
                          <p className="text-xs font-medium text-[#D93B52]">
                            {lang === 'bn' ? AGE_GROUPS[ageKey].rangeBn : AGE_GROUPS[ageKey].rangeEn}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-4 rounded-2xl bg-[#F3F0FE] border border-[#B8A5F5]/60 p-5 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#29243B] flex items-center gap-1.5">
                        <Baby className="w-4 h-4 text-[#D93B52]" />
                        {lang === 'bn' ? 'শিশুর বৃদ্ধি ও টিকা ট্র্যাকার' : 'Baby Growth & EPI Vaccine Tracker'}
                      </p>
                      <p className="text-xs text-[#777486] mt-1">
                        {lang === 'bn'
                          ? 'ওজন, উচ্চতা, টিকার তারিখ ও বয়স অনুযায়ী পণ্যের পরামর্শ পান।'
                          : 'Track weight, height, EPI vaccines & unlock age-matched products.'}
                      </p>
                    </div>
                    <Link
                      to="/baby-tracker"
                      onClick={() => setMegaMenu(null)}
                      className="inline-block mt-3 text-xs font-semibold text-[#29243B] hover:text-[#D93B52]"
                    >
                      {lang === 'bn' ? 'বেবি ট্র্যাকার খুলুন →' : 'Open Baby Tracker →'}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Creation Studio Drawer */}
      {createDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'bn' ? 'আপনি কী তৈরি করতে চান?' : 'What would you like to create?'}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#29243B]/45 backdrop-blur-xs p-0 sm:p-4"
        >
          <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-6 border border-[#ECEAF0] shadow-2xl space-y-5 animate-sheet-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#29243B]">
                  {lang === 'bn' ? 'আপনি কী তৈরি করতে চান?' : 'What would you like to create?'}
                </h2>
                <p className="text-xs text-[#777486] mt-0.5">
                  {lang === 'bn'
                    ? 'ভিডিও, ছবির পোস্ট, প্রশ্ন, পোল বা পণ্যের রিভিউ বেছে নিন'
                    : 'Share a video, photo post, question, poll, or product review with mothers'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateDrawerOpen(false)}
                aria-label="Close creation drawer"
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#FAF9F6] text-[#29243B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CREATION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.en}
                    type="button"
                    onClick={() => {
                      setCreateDrawerOpen(false);
                      navigate(opt.to);
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-2xl border border-[#ECEAF0] bg-[#FAF9F6] hover:bg-white hover:border-[#FF6478]/60 text-left transition-all"
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${opt.tint}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#29243B]">
                        {lang === 'bn' ? opt.bn : opt.en}
                      </span>
                      <span className="block text-xs text-[#777486] mt-0.5">
                        {lang === 'bn' ? opt.descBn : opt.descEn}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Workspace & Account Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#29243B]/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#FAF9F6] h-full overflow-y-auto p-6 flex flex-col justify-between border-l border-[#ECEAF0]">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                <BrandLogo />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleLang}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#ECEAF0] bg-white text-xs font-semibold text-[#29243B] min-h-[36px]"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#D93B52]" />
                    <span>{lang === 'bn' ? 'বাংলা → EN' : 'EN → বাংলা'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close menu"
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl hover:bg-[#FFE3D9]/50"
                  >
                    <X className="w-5 h-5 text-[#29243B]" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#ECEAF0] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#29243B] truncate">
                      {firebaseUser?.displayName || (lang === 'bn' ? 'আয়েশা আক্তার (ডেমো)' : 'Ayesha Akter (Demo)')}
                    </p>
                    <p className="text-xs text-[#777486] truncate">
                      {firebaseUser?.email || (lang === 'bn' ? 'অতিথি ডেমো সেশন' : 'Guest Demo Session')}
                    </p>
                  </div>
                  <Link
                    to="/account"
                    onClick={() => setDrawerOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-[#FFE3D9] text-xs font-semibold text-[#29243B] shrink-0 inline-flex items-center gap-1"
                  >
                    <User className="w-3 h-3" />
                    {t(lang, 'account')}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {firebaseUser ? (
                    <button
                      type="button"
                      onClick={signOutUser}
                      className="px-3 py-1.5 rounded-xl border border-[#ECEAF0] text-xs font-medium text-[#29243B] hover:bg-[#FAF9F6]"
                    >
                      {t(lang, 'logout')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      className="px-3 py-1.5 rounded-xl bg-[#29243B] text-white text-xs font-medium hover:bg-[#E83F58] transition-colors"
                    >
                      {t(lang, 'login')} (Google)
                    </button>
                  )}
                  <PWAInstallButton />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/cart"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-white border border-[#ECEAF0] hover:border-[#FF6478] text-xs font-semibold text-[#29243B]"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#D93B52]" />
                    {t(lang, 'cart')}
                  </span>
                  {cartCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#29243B] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {formatCount(cartCount, lang)}
                    </span>
                  )}
                </Link>
                <Link
                  to="/home"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-semibold text-[#29243B]"
                >
                  <Compass className="w-3.5 h-3.5 text-[#29243B]" />
                  {lang === 'bn' ? 'ডিসকভারি হোম' : 'Discovery Home'}
                </Link>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#777486] px-2 pb-1">
                  {lang === 'bn' ? 'অ্যাকাউন্ট, শপিং ও পরিবার' : 'Account, Shopping & Care'}
                </p>
                {[
                  { to: '/account', label: lang === 'bn' ? 'আমার অ্যাকাউন্ট হাব' : 'My Account Hub' },
                  { to: '/guide', label: lang === 'bn' ? 'মায়ের গাইড' : "Mother's Guide" },
                  { to: '/baby-tracker', label: t(lang, 'navTracker') },
                  { to: '/orders', label: t(lang, 'orders') },
                  { to: '/wishlist', label: t(lang, 'wishlist') },
                  { to: '/appointments', label: lang === 'bn' ? 'আমার অ্যাপয়েন্টমেন্ট' : 'My Appointments' },
                  { to: '/saved', label: lang === 'bn' ? 'সেভ করা কালেকশন' : 'Saved Collections' },
                  { to: '/support', label: lang === 'bn' ? 'সাপোর্ট ও রিটার্ন টিকেট' : 'Support & Returns' },
                  { to: '/creators', label: lang === 'bn' ? 'ক্রিয়েটর নেটওয়ার্ক' : 'Creator Network' },
                  { to: '/brands', label: lang === 'bn' ? 'পার্টনার ব্র্যান্ডসমূহ' : 'Brands We Love' },
                  { to: '/messages', label: t(lang, 'messages') },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-medium text-[#29243B] hover:bg-[#B8A5F5]/15 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="space-y-1 pt-2 border-t border-[#ECEAF0]">
                <p className="text-xs font-semibold text-[#777486] px-2 pb-1">
                  {lang === 'bn' ? 'পার্টনার ও অ্যাডমিন ড্যাশবোর্ড' : 'Partner & Admin Dashboards'}
                </p>
                {[
                  { to: '/seller/dashboard', label: t(lang, 'sellerHub') },
                  { to: '/seller/register', label: lang === 'bn' ? 'নতুন সেলার নিবন্ধন' : 'Become a Seller' },
                  { to: '/creator/dashboard', label: t(lang, 'creatorHub') },
                  { to: '/doctor/dashboard', label: lang === 'bn' ? 'ডাক্তার ড্যাশবোর্ড' : 'Doctor Dashboard' },
                  { to: '/admin', label: t(lang, 'adminPanel') },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-medium text-[#29243B] hover:bg-[#B8DCCB]/30 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[#ECEAF0] flex flex-wrap gap-3 text-xs text-[#777486]">
              <Link to="/about" onClick={() => setDrawerOpen(false)} className="hover:text-[#29243B]">
                About
              </Link>
              <Link to="/help" onClick={() => setDrawerOpen(false)} className="hover:text-[#29243B]">
                Help
              </Link>
              <Link to="/privacy" onClick={() => setDrawerOpen(false)} className="hover:text-[#29243B]">
                Privacy
              </Link>
              <Link to="/terms" onClick={() => setDrawerOpen(false)} className="hover:text-[#29243B]">
                Terms
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content (Edge-to-edge full-screen on mobile video route) */}
      <main className={`flex-1 ${isMobileVideoRoute ? 'pb-0' : 'pb-20 lg:pb-0'}`}>
        {children}
      </main>

      {/* Rich Footer + Newsletter (Sections 15 & 16) */}
      <footer className="hidden lg:block border-t border-[#ECEAF0] bg-white pt-12 pb-10">
        <div className="max-w-[1440px] mx-auto px-8 space-y-10">
          {/* Newsletter Row */}
          <div className="rounded-3xl bg-[#FAF9F6] border border-[#ECEAF0] p-6 xl:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <p className="text-xs font-semibold text-[#D93B52] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {lang === 'bn' ? 'সাপ্তাহিক প্যারেন্টিং টিপস ও অফার' : 'Weekly Parenting Notes & Exclusive Offers'}
              </p>
              <h2 className="text-xl font-semibold text-[#29243B]">
                {lang === 'bn'
                  ? 'আপনার শিশুর বয়স অনুযায়ী গাইড ও ছাড়ের খবর পান'
                  : 'Get milestone guides & Bangladesh family deals in your inbox'}
              </h2>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Mail className="w-4 h-4 text-[#777486] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={lang === 'bn' ? 'আপনার ইমেইল লিখুন...' : 'Enter your email address...'}
                  aria-label="Newsletter email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#ECEAF0] text-sm text-[#29243B] focus:outline-none focus:border-[#B8A5F5]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {newsletterDone
                  ? lang === 'bn'
                    ? 'সাবস্ক্রাইব সম্পন্ন'
                    : 'Subscribed'
                  : lang === 'bn'
                    ? 'সাবস্ক্রাইব করুন'
                    : 'Subscribe'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-12 gap-8 text-xs text-[#777486]">
            <div className="col-span-4 space-y-3">
              <BrandLogo />
              <p className="text-sm text-[#29243B]/80 font-medium">{t(lang, 'tagline')}</p>
              <p className="leading-relaxed">
                {lang === 'bn'
                  ? 'বাংলাদেশের মা ও পরিবারের জন্য নিরাপদ বেবি প্রোডাক্ট, অভিজ্ঞ চিকিৎসক, বেবি গ্রোথ ট্র্যাকার এবং মায়েদের সামাজিক কমিউনিটি।'
                  : 'A unified Bangladesh mother, baby & parenting ecosystem combining curated shopping, community discovery, doctor care, and child growth tools.'}
              </p>
            </div>

            <div className="col-span-2 space-y-2.5">
              <p className="font-semibold text-[#29243B] text-xs uppercase tracking-wider">
                {lang === 'bn' ? 'শপ ও ব্র্যান্ড' : 'Shop'}
              </p>
              <ul className="space-y-2">
                <li><Link to="/marketplace" className="hover:text-[#29243B]">All Products</Link></li>
                <li><Link to="/marketplace?age=newborn" className="hover:text-[#29243B]">Newborn (0–3m)</Link></li>
                <li><Link to="/marketplace/categories/baby_gear" className="hover:text-[#29243B]">Baby Gear</Link></li>
                <li><Link to="/marketplace/categories/maternity_wear" className="hover:text-[#29243B]">Maternity Wear</Link></li>
                <li><Link to="/brands" className="hover:text-[#29243B]">Partner Brands</Link></li>
              </ul>
            </div>

            <div className="col-span-3 space-y-2.5">
              <p className="font-semibold text-[#29243B] text-xs uppercase tracking-wider">
                {lang === 'bn' ? 'সেবা ও কমিউনিটি' : 'Care & Community'}
              </p>
              <ul className="space-y-2">
                <li><Link to="/discover" className="hover:text-[#29243B]">Mothers Community Feed</Link></li>
                <li><Link to="/videos" className="hover:text-[#29243B]">Short Parenting Videos</Link></li>
                <li><Link to="/doctors" className="hover:text-[#29243B]">Doctor Corner</Link></li>
                <li><Link to="/baby-tracker" className="hover:text-[#29243B]">Baby Growth &amp; Vaccine Tracker</Link></li>
                <li><Link to="/guide" className="hover:text-[#29243B] inline-flex items-center gap-1"><BookOpen className="w-3 h-3 text-[#D93B52]" /> Parenting Guides</Link></li>
              </ul>
            </div>

            <div className="col-span-3 space-y-2.5">
              <p className="font-semibold text-[#29243B] text-xs uppercase tracking-wider">
                {lang === 'bn' ? 'সেলার ও সহায়তা' : 'Partners & Support'}
              </p>
              <ul className="space-y-2">
                <li><Link to="/seller/register" className="hover:text-[#29243B] inline-flex items-center gap-1"><Store className="w-3 h-3 text-[#1E5A40]" /> Become a Seller</Link></li>
                <li><Link to="/support" className="hover:text-[#29243B]">Support &amp; Return Center</Link></li>
                <li><Link to="/shipping" className="hover:text-[#29243B]">Shipping Policy (BD)</Link></li>
                <li><Link to="/returns" className="hover:text-[#29243B]">Return &amp; Refund Policy</Link></li>
                <li><Link to="/privacy" className="hover:text-[#29243B]">Privacy</Link> · <Link to="/terms" className="hover:text-[#29243B]">Terms</Link> · <Link to="/contact" className="hover:text-[#29243B]">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#ECEAF0] flex items-center justify-between text-xs text-[#777486]">
            <span>© 2026 Aloorai Bangladesh · {t(lang, 'tagline')}</span>
            <span>BDT (৳) · {lang === 'bn' ? 'বাংলা ও English' : 'English & বাংলা'}</span>
          </div>
        </div>
      </footer>

      {/* Final Mobile Bottom Navigation: Exact 5 Positions (Shop | Videos | Create | Community | Doctors) */}
      <nav
        aria-label="Mobile Navigation"
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 min-h-[58px] pb-safe grid grid-cols-5 items-center transition-colors ${
          isMobileVideoRoute
            ? 'bg-[#29243B]/50 backdrop-blur-md border-t border-white/15'
            : 'bg-white/95 backdrop-blur-md border-t border-[#ECEAF0]'
        }`}
      >
        {/* 1. Shop */}
        <Link
          to="/marketplace"
          aria-label={t(lang, 'navShop')}
          aria-current={
            location.pathname.startsWith('/marketplace') ||
            location.pathname.startsWith('/products') ||
            location.pathname.startsWith('/brands') ||
            location.pathname.startsWith('/shops') ||
            location.pathname.startsWith('/cart') ||
            location.pathname.startsWith('/checkout')
              ? 'page'
              : undefined
          }
          className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium whitespace-nowrap transition-colors ${
            location.pathname.startsWith('/marketplace') ||
            location.pathname.startsWith('/products') ||
            location.pathname.startsWith('/brands') ||
            location.pathname.startsWith('/shops') ||
            location.pathname.startsWith('/cart') ||
            location.pathname.startsWith('/checkout')
              ? 'text-[#FF6478] font-semibold'
              : isMobileVideoRoute
                ? 'text-white/90 hover:text-white'
                : 'text-[#29243B]'
          }`}
        >
          <ShoppingBag className="w-[19px] h-[19px]" />
          <span className="mt-0.5 leading-none">{t(lang, 'navShop')}</span>
        </Link>

        {/* 2. Videos (Mobile Default Entry) */}
        <Link
          to="/"
          aria-label={t(lang, 'navVideos')}
          aria-current={location.pathname === '/' || location.pathname === '/videos' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium whitespace-nowrap transition-colors ${
            location.pathname === '/' || location.pathname === '/videos'
              ? 'text-[#FF6478] font-semibold'
              : isMobileVideoRoute
                ? 'text-white/90 hover:text-white'
                : 'text-[#29243B]'
          }`}
        >
          <Film className="w-[19px] h-[19px]" />
          <span className="mt-0.5 leading-none">{t(lang, 'navVideos')}</span>
        </Link>

        {/* 3. Create (+) Central Prominent Electric Coral Circle */}
        <button
          type="button"
          onClick={() => setCreateDrawerOpen(true)}
          aria-label={lang === 'bn' ? 'তৈরি করুন' : 'Create'}
          className="flex flex-col items-center justify-center min-h-[44px]"
        >
          <span
            className={`-mt-4 w-12 h-12 rounded-full bg-[#FF6478] hover:bg-[#E83F58] text-white flex items-center justify-center shadow-[0_6px_18px_rgba(255,100,120,0.42)] border-[3px] transition-transform active:scale-95 ${
              isMobileVideoRoute ? 'border-white/90' : 'border-white'
            }`}
          >
            <Plus className="w-5 h-5 stroke-[2.6]" />
          </span>
        </button>

        {/* 4. Community */}
        <Link
          to="/community"
          aria-label={t(lang, 'navCommunity')}
          aria-current={
            location.pathname.startsWith('/community') ||
            location.pathname.startsWith('/questions') ||
            location.pathname.startsWith('/discover') ||
            location.pathname.startsWith('/following') ||
            location.pathname.startsWith('/trending')
              ? 'page'
              : undefined
          }
          className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium whitespace-nowrap transition-colors ${
            location.pathname.startsWith('/community') ||
            location.pathname.startsWith('/questions') ||
            location.pathname.startsWith('/discover') ||
            location.pathname.startsWith('/following') ||
            location.pathname.startsWith('/trending')
              ? 'text-[#FF6478] font-semibold'
              : isMobileVideoRoute
                ? 'text-white/90 hover:text-white'
                : 'text-[#29243B]'
          }`}
        >
          <MessageCircle className="w-[19px] h-[19px]" />
          <span className="mt-0.5 leading-none">{t(lang, 'navCommunity')}</span>
        </Link>

        {/* 5. Doctors */}
        <Link
          to="/doctors"
          aria-label={lang === 'bn' ? 'ডাক্তার' : 'Doctors'}
          aria-current={
            location.pathname.startsWith('/doctors') || location.pathname.startsWith('/appointments')
              ? 'page'
              : undefined
          }
          className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium whitespace-nowrap transition-colors ${
            location.pathname.startsWith('/doctors') || location.pathname.startsWith('/appointments')
              ? 'text-[#FF6478] font-semibold'
              : isMobileVideoRoute
                ? 'text-white/90 hover:text-white'
                : 'text-[#29243B]'
          }`}
        >
          <Stethoscope className="w-[19px] h-[19px]" />
          <span className="mt-0.5 leading-none">{lang === 'bn' ? 'ডাক্তার' : 'Doctors'}</span>
        </Link>
      </nav>

      <AICompanion />
      <OfflineIndicator />
    </div>
  );
};
