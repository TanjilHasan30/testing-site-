import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  GitCompare,
  Heart,
  HelpCircle,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { AGE_GROUPS, t } from '../i18n/translations';
import {
  calculateProductDiscountPct,
  formatBdt,
  resolveVideoMedia,
  toggleCompareProductIds,
} from '../lib/domain';
import type {
  AgeGroupKey,
  BrandProfile,
  CategoryConfig,
  PostItem,
  ProductItem,
  ProductQuestion,
  SellerProfile,
} from '../types/platform';

export const MarketplacePage: React.FC = () => {
  const { slug: routeCategoryOrShop } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, apiFetch, addToCart, showToast } = useApp();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [creatorRecs, setCreatorRecs] = useState<PostItem[]>([]);

  const [category, setCategory] = useState('all');
  const [ageFilter, setAgeFilter] = useState<string>(searchParams.get('age') || 'all');
  const [brandFilter, setBrandFilter] = useState<string>(searchParams.get('brand') || 'all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc'>('popular');
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    setAgeFilter(searchParams.get('age') || 'all');
    setBrandFilter(searchParams.get('brand') || 'all');
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      apiFetch<{
        products: ProductItem[];
        sellers: SellerProfile[];
        brands: BrandProfile[];
        categories: CategoryConfig[];
      }>('/api/v1/products'),
      apiFetch<{ items: PostItem[] }>('/api/v1/feed?tab=discover&limit=12'),
    ])
      .then(([prodRes, feedRes]) => {
        setProducts(prodRes.products);
        setSellers(prodRes.sellers);
        setBrands(prodRes.brands);
        setCategories(prodRes.categories);
        setCreatorRecs(feedRes.items.filter((p) => p.taggedProductIds.length > 0).slice(0, 3));
        if (routeCategoryOrShop && prodRes.categories.some((c) => c.slug === routeCategoryOrShop)) {
          setCategory(routeCategoryOrShop);
        } else if (!routeCategoryOrShop) {
          setCategory('all');
        }
      })
      .finally(() => setLoading(false));
  }, [apiFetch, routeCategoryOrShop]);

  const isShopRoute = Boolean(
    routeCategoryOrShop && !categories.some((c) => c.slug === routeCategoryOrShop)
  );

  const filtered = products
    .filter((p) => {
      if (isShopRoute && routeCategoryOrShop) {
        return p.shopSlug === routeCategoryOrShop;
      }
      return category === 'all' || p.category === category;
    })
    .filter((p) => (ageFilter === 'all' ? true : p.ageGroups?.includes(ageFilter as AgeGroupKey)))
    .filter((p) => (brandFilter === 'all' ? true : p.brandId === brandFilter || p.shopSlug === brandFilter))
    .filter((p) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p.titleEn.toLowerCase().includes(q) ||
        p.titleBn.toLowerCase().includes(q) ||
        p.shopName.toLowerCase().includes(q) ||
        (p.brandName || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceBdt - b.priceBdt;
      if (sortBy === 'price_desc') return b.priceBdt - a.priceBdt;
      return b.reviewsCount - a.reviewsCount;
    });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Editorial Social Storefront Banner */}
      <section className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECEAF0] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-semibold text-[#1E5A40] flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            {t(lang, 'freeDeliveryNote')}
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#29243B]">
            {lang === 'bn' ? 'Aloorai শপ ও মার্কেটপ্লেস' : 'Aloorai Multi-Vendor Marketplace'}
          </h1>
          <p className="text-sm text-[#777486]">
            {lang === 'bn'
              ? 'মায়েদের রিভিউ করা নিরাপদ দেশীয় শিশু পণ্য, ম্যাটারনিটি পোশাক, বেবি গিয়ার ও শিক্ষামূলক খেলনা।'
              : 'Shop curated baby essentials, maternity wear, strollers, skincare, and developmental toys across Bangladesh.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/wishlist"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#ECEAF0] text-xs font-semibold text-[#29243B] hover:border-[#B8A5F5]"
          >
            <Heart className="w-3.5 h-3.5 text-[#D93B52]" />
            {t(lang, 'wishlist')}
          </Link>
          <Link
            to="/seller/register"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#ECEAF0] text-xs font-semibold text-[#29243B] hover:border-[#B8A5F5]"
          >
            <Store className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'সেলার হন' : 'Become a Seller'}
          </Link>
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E83F58] text-white text-xs font-semibold hover:bg-[#D6324B]"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {t(lang, 'cart')}
          </Link>
        </div>
      </section>

      {/* Age Stage Quick Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => {
            setAgeFilter('all');
            setSearchParams({});
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
            ageFilter === 'all'
              ? 'bg-[#29243B] text-white'
              : 'bg-white border border-[#ECEAF0] text-[#777486] hover:text-[#29243B]'
          }`}
        >
          {lang === 'bn' ? 'সব বয়স' : 'All Ages'}
        </button>
        {(Object.keys(AGE_GROUPS) as AgeGroupKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setAgeFilter(key);
              setSearchParams({ age: key });
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              ageFilter === key
                ? 'bg-[#E83F58] text-white'
                : 'bg-white border border-[#ECEAF0] text-[#29243B] hover:border-[#FF6478]'
            }`}
          >
            {lang === 'bn'
              ? `${AGE_GROUPS[key].bn} (${AGE_GROUPS[key].rangeBn})`
              : `${AGE_GROUPS[key].en} (${AGE_GROUPS[key].rangeEn})`}
          </button>
        ))}
      </div>

      {/* Category Pills, Brand Filter & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center lg:flex-wrap gap-1.5 overflow-x-auto lg:overflow-visible no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              category === 'all'
                ? 'bg-[#B8A5F5]/30 border border-[#B8A5F5] text-[#29243B] font-semibold'
                : 'bg-white border border-[#ECEAF0] text-[#777486] hover:text-[#29243B]'
            }`}
          >
            {lang === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setCategory(cat.slug)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                category === cat.slug
                  ? 'bg-[#B8A5F5]/30 border border-[#B8A5F5] text-[#29243B] font-semibold'
                  : 'bg-white border border-[#ECEAF0] text-[#777486] hover:text-[#29243B]'
              }`}
            >
              {lang === 'bn' ? cat.nameBn : cat.nameEn}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[#777486] absolute left-3 top-2.5" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'bn' ? 'পণ্য খুঁজুন...' : 'Search products...'}
              className="pl-9 pr-3 py-2 rounded-xl bg-white border border-[#ECEAF0] text-xs w-44 sm:w-52 focus:outline-none focus:border-[#B8A5F5]"
            />
          </div>
          <select
            aria-label="Filter by brand"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-[#ECEAF0] text-xs text-[#29243B]"
          >
            <option value="all">{lang === 'bn' ? 'সব ব্র্যান্ড' : 'All Brands'}</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {lang === 'bn' ? b.nameBn : b.nameEn}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'popular' | 'price_asc' | 'price_desc')}
            className="px-3 py-2 rounded-xl bg-white border border-[#ECEAF0] text-xs text-[#29243B]"
          >
            <option value="popular">Popular</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Uniform Product Grid (2-column on mobile, 4-column on desktop) */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 sm:h-80 rounded-2xl sm:rounded-3xl bg-white animate-pulse border border-[#ECEAF0]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#ECEAF0] space-y-3">
          <p className="text-sm text-[#777486]">
            {lang === 'bn' ? 'এই ফিল্টারে কোনো পণ্য পাওয়া যায়নি।' : 'No products match the selected filters.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory('all');
              setAgeFilter('all');
              setBrandFilter('all');
              setQuery('');
              setSearchParams({});
            }}
            className="px-4 py-2 rounded-xl bg-[#29243B] text-white text-xs font-semibold"
          >
            {lang === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              isCompared={compareIds.includes(p.id)}
              onToggleCompare={(id) => {
                const res = toggleCompareProductIds(compareIds, id, 3);
                if (res.limitReached) {
                  showToast(lang === 'bn' ? 'সর্বোচ্চ ৩টি পণ্য তুলনা করা যাবে' : 'Compare up to 3 products at once');
                } else {
                  setCompareIds(res.ids);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Creator Recommendations & Video Shopping */}
      {creatorRecs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#29243B]">
              {lang === 'bn' ? 'ক্রিয়েটরদের পছন্দ ও ভিডিও শপিং' : 'Creator Recommendations & Video Shopping'}
            </h2>
            <Link to="/videos" className="text-xs font-semibold text-[#D93B52] hover:underline">
              {lang === 'bn' ? 'ভিডিও দেখুন →' : 'Watch Reels →'}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {creatorRecs.map((rec) => {
              const thumb = rec.isVideo ? resolveVideoMedia(rec.mediaUrls).posterSrc : rec.mediaUrls[0];
              return (
                <Link
                  key={rec.id}
                  to={`/products/${rec.taggedProductIds[0]}`}
                  className="bg-white rounded-2xl p-3.5 border border-[#ECEAF0] flex items-center gap-3.5 hover:border-[#FF6478]/60 transition-colors"
                >
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-[#FFE3D9]/40">
                    <img src={thumb} alt={rec.titleEn} className="w-full h-full object-cover" />
                    {rec.isVideo && (
                      <span className="absolute inset-0 bg-[#29243B]/35 flex items-center justify-center text-white">
                        <Play className="w-4 h-4 fill-white" />
                      </span>
                    )}
                  </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-medium text-[#D93B52]">{rec.authorName}</p>
                  <p className="text-sm font-semibold text-[#29243B] line-clamp-2">
                    {lang === 'bn' ? rec.titleBn : rec.titleEn}
                  </p>
                </div>
              </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Partner Shops Directory */}
      {sellers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#29243B]">
            {lang === 'bn' ? 'পার্টনার বেবি শপসমূহ' : 'Partner Marketplace Sellers'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sellers.map((s) => (
              <Link
                key={s.id}
                to={`/shops/${s.shopSlug}`}
                className="bg-white rounded-2xl p-4 border border-[#ECEAF0] flex items-center justify-between hover:border-[#B8A5F5]"
              >
                <div>
                  <p className="text-sm font-semibold text-[#29243B]">{s.shopName}</p>
                  <p className="text-xs text-[#777486]">
                    {s.district} · Rating {s.rating}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#D93B52]">Visit Shop →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Floating Product Comparison Bar */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-[64px] lg:bottom-6 left-3 right-[70px] lg:left-6 lg:right-auto z-30 bg-[#29243B] text-white rounded-2xl p-2.5 sm:px-4 shadow-xl border border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <GitCompare className="w-4 h-4 text-[#FF6478] shrink-0" />
            <span className="text-xs font-semibold truncate tabular-nums">
              {lang === 'bn'
                ? `${compareIds.length}টি পণ্য নির্বাচিত`
                : `${compareIds.length} selected`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="px-2.5 py-1.5 rounded-xl bg-white/15 text-[11px] font-semibold hover:bg-white/25"
            >
              {lang === 'bn' ? 'মুছুন' : 'Clear'}
            </button>
            <button
              type="button"
              disabled={compareIds.length < 2}
              onClick={() => setCompareOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#E83F58] disabled:opacity-50 text-white text-[11px] font-semibold hover:bg-[#FF6478]"
            >
              {lang === 'bn' ? 'তুলনা দেখুন' : 'Compare'}
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Product Comparison Sheet */}
      {compareOpen && compareIds.length >= 2 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'bn' ? 'পণ্যের তুলনা' : 'Product Comparison'}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#29243B]/60 p-0 sm:p-4"
        >
          <div className="bg-white w-full sm:max-w-3xl max-h-[88dvh] rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 border border-[#ECEAF0] shadow-2xl flex flex-col gap-3 sm:gap-4 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-base sm:text-lg font-semibold text-[#29243B] flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-[#D93B52]" />
                {lang === 'bn' ? 'পণ্যের পাশাপাশি তুলনা' : 'Compare Selected Products'}
              </h2>
              <button
                type="button"
                onClick={() => setCompareOpen(false)}
                aria-label="Close comparison"
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#FAF9F6]"
              >
                <X className="w-5 h-5 text-[#29243B]" />
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1">
              <div
                className={`grid gap-2.5 sm:gap-3 ${compareIds.length >= 3 ? 'min-w-[460px]' : 'min-w-0'}`}
                style={{
                  gridTemplateColumns:
                    compareIds.length >= 3
                      ? `repeat(${compareIds.length}, minmax(145px, 1fr))`
                      : `repeat(${compareIds.length}, minmax(0, 1fr))`,
                }}
              >
                {products
                  .filter((p) => compareIds.includes(p.id))
                  .map((p) => {
                    const disc = calculateProductDiscountPct(p.priceBdt, p.compareAtBdt);
                    return (
                      <div key={p.id} className="rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] p-3 space-y-2.5 flex flex-col justify-between">
                        <div className="space-y-2">
                          <img
                            src={p.imageUrl}
                            alt={p.titleEn}
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[4/3] object-cover rounded-xl bg-white"
                          />
                          <Link
                            to={`/products/${p.id}`}
                            onClick={() => setCompareOpen(false)}
                            className="text-xs font-semibold text-[#29243B] line-clamp-2 hover:text-[#D93B52]"
                          >
                            {lang === 'bn' ? p.titleBn : p.titleEn}
                          </Link>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-bold text-[#D93B52] tabular-nums">
                              {formatBdt(p.priceBdt, lang)}
                            </span>
                            {disc > 0 && <span className="text-[10px] font-semibold text-[#1E5A40]">-{disc}%</span>}
                          </div>
                          <dl className="text-[11px] space-y-1.5 pt-2 border-t border-[#ECEAF0]">
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#777486]">Rating</dt>
                              <dd className="font-semibold text-[#29243B] tabular-nums">
                                {p.rating.toFixed(1)} ({p.reviewsCount})
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#777486]">Stock</dt>
                              <dd className="font-semibold text-[#29243B] tabular-nums">{p.stock}</dd>
                            </div>
                            <div>
                              <dt className="text-[#777486]">Stage</dt>
                              <dd className="font-medium text-[#29243B]">
                                {(p.ageGroups ?? []).map((a) => (lang === 'bn' ? AGE_GROUPS[a].bn : AGE_GROUPS[a].en)).join(', ') || 'All'}
                              </dd>
                            </div>
                            {(p.safetyInfoEn || p.safetyInfoBn) && (
                              <div>
                                <dt className="text-[#777486]">Safety</dt>
                                <dd className="text-[#1E5A40] line-clamp-2">
                                  {lang === 'bn' ? p.safetyInfoBn : p.safetyInfoEn}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            addToCart({
                              productId: p.id,
                              variant: p.variants[0] || 'Standard',
                              quantity: 1,
                            })
                          }
                          className="w-full py-2 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
                        >
                          {t(lang, 'addToCart')}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { lang, apiFetch, addToCart, wishlistIds, toggleWishlist, showToast } = useApp();
  const videoOrigin = (location.state as { fromVideoId?: string; fromVideoPath?: string; restoreTime?: number } | null) ?? null;
  const fromVideoId = videoOrigin?.fromVideoId || searchParams.get('fromVideo') || undefined;
  const fromVideoPath = videoOrigin?.fromVideoPath || '/';
  const restoreTime = videoOrigin?.restoreTime ?? 0;
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [related, setRelated] = useState<ProductItem[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [variant, setVariant] = useState('');
  const [qty, setQty] = useState(1);
  const [questionText, setQuestionText] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!id) return;
    setActiveImage(0);
    setZoomed(false);
    apiFetch<{ product: ProductItem; related?: ProductItem[] }>(`/api/v1/products/${id}`)
      .then((res) => {
        setProduct(res.product);
        setRelated(res.related ?? []);
        setVariant(res.product.variants[0] || 'Standard');
      })
      .catch(() => setProduct(null));
  }, [id, apiFetch]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !questionText.trim()) return;
    setAsking(true);
    try {
      const created = await apiFetch<ProductQuestion>(`/api/v1/products/${product.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({ question: questionText }),
      });
      setProduct((prev) =>
        prev ? { ...prev, questions: [created, ...(prev.questions ?? [])] } : prev
      );
      setQuestionText('');
      showToast(lang === 'bn' ? 'প্রশ্ন যোগ হয়েছে' : 'Question posted to product Q&A');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit question');
    } finally {
      setAsking(false);
    }
  };

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <p className="text-sm text-[#777486]">{t(lang, 'loading')}</p>
      </div>
    );
  }

  const gallery = product.galleryUrls && product.galleryUrls.length > 0 ? product.galleryUrls : [product.imageUrl];
  const discountPct = calculateProductDiscountPct(product.priceBdt, product.compareAtBdt);
  const wished = wishlistIds.includes(product.id);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 sm:py-6 space-y-8 sm:space-y-10">
      {fromVideoId && (
        <div>
          <button
            type="button"
            onClick={() => navigate(fromVideoPath, { state: { restoreVideoId: fromVideoId, restoreTime } })}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#ECEAF0] hover:border-[#FF6478] text-xs font-semibold text-[#29243B] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#D93B52]" />
            <span>{lang === 'bn' ? 'ভিডিওতে ফিরে যান' : 'Back to Video'}</span>
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border border-[#ECEAF0] grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
        {/* Image Gallery with Zoom */}
        <div className="space-y-3">
          <div className="relative aspect-[4/3] rounded-2xl bg-[#FAF9F6] overflow-hidden border border-[#ECEAF0]">
            <img
              src={gallery[activeImage] || product.imageUrl}
              alt={product.titleEn}
              referrerPolicy="no-referrer"
              onClick={() => setZoomed((z) => !z)}
              className={`w-full h-full object-cover cursor-zoom-in transition-transform duration-300 ${
                zoomed ? 'scale-125' : 'scale-100'
              }`}
            />
            {discountPct > 0 && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#E83F58] text-white text-xs font-semibold tabular-nums">
                -{discountPct}%
              </span>
            )}
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              aria-label="Toggle image zoom"
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/90 text-[#29243B] text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              {zoomed ? 'Reset' : 'Zoom'}
            </button>
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
              {gallery.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}_${idx}`}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 ${
                    idx === activeImage ? 'border-[#E83F58]' : 'border-[#ECEAF0]'
                  }`}
                >
                  <img src={imgUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info & Purchase Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Link to={`/shops/${product.shopSlug}`} className="text-xs font-semibold text-[#D93B52] hover:underline">
              {product.shopName}
            </Link>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#29243B] tabular-nums">
              <Star className="w-3.5 h-3.5 fill-[#FF6478] text-[#FF6478]" />
              {product.rating.toFixed(1)} ({product.reviewsCount} reviews)
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-[#29243B]">
            {lang === 'bn' ? product.titleBn : product.titleEn}
          </h1>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[#29243B] tabular-nums">
              {formatBdt(product.priceBdt, lang)}
            </span>
            {product.compareAtBdt && (
              <span className="text-sm text-[#777486] line-through tabular-nums">
                {formatBdt(product.compareAtBdt, lang)}
              </span>
            )}
          </div>

          <p className="text-sm text-[#29243B]/80 leading-relaxed">
            {lang === 'bn' ? product.descriptionBn : product.descriptionEn}
          </p>

          {product.ageGroups && product.ageGroups.length > 0 && (
            <p className="text-xs text-[#1E5A40] font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {lang === 'bn' ? 'উপযুক্ত বয়স:' : 'Recommended Stage:'}{' '}
              {product.ageGroups.map((a) => (lang === 'bn' ? AGE_GROUPS[a].bn : AGE_GROUPS[a].en)).join(', ')}
            </p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#29243B]">{lang === 'bn' ? 'ভ্যারিয়েন্ট' : 'Select Variant'}</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                    variant === v ? 'bg-[#29243B] text-white' : 'bg-[#FAF9F6] border border-[#ECEAF0] text-[#29243B]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <div className="flex items-center border border-[#ECEAF0] rounded-xl bg-[#FAF9F6]">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2.5 text-sm font-semibold text-[#29243B]"
              >
                -
              </button>
              <span className="px-3 text-sm font-semibold tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(Math.max(1, product.stock), q + 1))}
                className="px-3 py-2.5 text-sm font-semibold text-[#29243B]"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => addToCart({ productId: product.id, variant, quantity: qty })}
              className="flex-1 py-3 px-4 rounded-xl bg-[#29243B] text-white text-sm font-semibold hover:bg-[#3c3556] transition-colors whitespace-nowrap"
            >
              {t(lang, 'addToCart')}
            </button>
            <button
              type="button"
              onClick={() => {
                addToCart({ productId: product.id, variant, quantity: qty });
                navigate('/checkout');
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-[#E83F58] text-white text-sm font-semibold hover:bg-[#D6324B] transition-colors whitespace-nowrap"
            >
              {t(lang, 'buyNow')}
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label="Toggle wishlist"
              className="w-11 h-11 rounded-xl border border-[#ECEAF0] flex items-center justify-center hover:bg-[#FFE3D9]/60"
            >
              <Heart className={`w-4 h-4 ${wished ? 'fill-[#FF6478] text-[#FF6478]' : 'text-[#777486]'}`} />
            </button>
          </div>

          {product.demoVideoPostId && (
            <Link
              to={`/videos?v=${product.demoVideoPostId}`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#D93B52] hover:underline pt-1"
            >
              <Play className="w-3.5 h-3.5 fill-[#D93B52]" />
              {lang === 'bn' ? 'মায়েদের শর্ট ভিডিও ডেমো দেখুন' : 'Watch Mother Video Demo'}
            </Link>
          )}
        </div>
      </div>

      {/* Specifications, Safety Info & Customer Q&A */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-5">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-[#29243B]">
              {lang === 'bn' ? 'পণ্যের বিবরণ ও স্পেসিফিকেশন' : 'Product Specifications'}
            </h2>
            {product.specifications ? (
              <dl className="divide-y divide-[#ECEAF0] text-xs">
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} className="py-2 flex justify-between gap-4">
                    <dt className="text-[#777486]">{k}</dt>
                    <dd className="font-semibold text-[#29243B] text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-[#777486]">Standard Bangladesh retail pack.</p>
            )}
          </div>

          {(product.safetyInfoEn || product.safetyInfoBn) && (
            <div className="p-4 rounded-2xl bg-[#EFF8F3] border border-[#B8DCCB] space-y-1">
              <p className="text-xs font-semibold text-[#1E5A40] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                {lang === 'bn' ? 'শিশুর সুরক্ষা তথ্য' : 'Safety & Material Care'}
              </p>
              <p className="text-xs text-[#29243B]/85 leading-relaxed">
                {lang === 'bn' ? product.safetyInfoBn : product.safetyInfoEn}
              </p>
            </div>
          )}
        </div>

        {/* Customer Questions & Answers */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
          <h2 className="text-base font-semibold text-[#29243B] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#D93B52]" />
            {lang === 'bn' ? 'ক্রেতাদের প্রশ্ন ও উত্তর (Q&A)' : 'Customer Questions & Answers'}
          </h2>

          <form onSubmit={handleAskQuestion} className="flex gap-2">
            <input
              required
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              aria-label={lang === 'bn' ? 'পণ্য সম্পর্কে প্রশ্ন লিখুন' : 'Ask a question about this product'}
              placeholder={
                lang === 'bn'
                  ? 'এই পণ্য সম্পর্কে কোনো প্রশ্ন থাকলে লিখুন...'
                  : 'Ask a question about size, material, or age suitability...'
              }
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs text-[#29243B]"
            />
            <button
              type="submit"
              disabled={asking}
              className="px-4 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold whitespace-nowrap"
            >
              {asking ? t(lang, 'loading') : lang === 'bn' ? 'জিজ্ঞাসা করুন' : 'Ask'}
            </button>
          </form>

          <div className="space-y-3">
            {(product.questions ?? []).length === 0 ? (
              <p className="text-xs text-[#777486]">
                {lang === 'bn' ? 'এখনো কোনো প্রশ্ন করা হয়নি।' : 'No customer questions yet. Ask the first question!'}
              </p>
            ) : (
              (product.questions ?? []).map((q) => (
                <div key={q.id} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] space-y-1.5">
                  <p className="text-xs font-semibold text-[#29243B]">Q: {q.question}</p>
                  {q.answer ? (
                    <p className="text-xs text-[#1E5A40]">
                      A ({q.answeredBy || product.shopName}): {q.answer}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#777486]">
                      Asked by {q.authorName} · Awaiting seller reply
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[#29243B]">
            {lang === 'bn' ? 'একসাথে বেশি কেনা হয় (সম্পর্কিত পণ্য)' : 'Frequently Bought Together & Related'}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
