import type {
  AgeGroupKey,
  AppointmentItem,
  CouponCode,
  FeedTab,
  GuideArticle,
  Language,
  PostItem,
  ProductItem,
  SellerSubOrder,
} from '../types/platform';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)] ?? d);
}

export function formatBdt(amount: number, lang: Language): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  const formatted = safe.toLocaleString('en-IN');
  return lang === 'bn' ? `৳${toBengaliDigits(formatted)}` : `৳${formatted}`;
}

export function formatCount(count: number, lang: Language): string {
  const safe = Math.max(0, Math.floor(count));
  const str = safe >= 1000 ? `${(safe / 1000).toFixed(1)}k` : String(safe);
  return lang === 'bn' ? toBengaliDigits(str) : str;
}

export function calculateProductDiscountPct(priceBdt: number, compareAtBdt?: number): number {
  if (!compareAtBdt || compareAtBdt <= priceBdt || priceBdt <= 0) return 0;
  return Math.round(((compareAtBdt - priceBdt) / compareAtBdt) * 100);
}

export function getAgeGroupFromMonths(ageMonths: number): AgeGroupKey {
  if (ageMonths <= 3) return 'newborn';
  if (ageMonths <= 12) return 'infant';
  if (ageMonths <= 36) return 'toddler';
  if (ageMonths <= 60) return 'preschool';
  return 'kids';
}

export function matchProductsForBaby(products: ProductItem[], ageMonths: number): ProductItem[] {
  const ageGroup = getAgeGroupFromMonths(ageMonths);
  const exact = products.filter(
    (p) => p.moderationStatus === 'approved' && p.ageGroups?.includes(ageGroup)
  );
  if (exact.length > 0) return exact;
  return products.filter((p) => p.moderationStatus === 'approved');
}

export function validateAndApplyCoupon(
  coupon: CouponCode | undefined,
  subtotalBdt: number
): { valid: boolean; discountBdt: number; error?: string } {
  if (!coupon || !coupon.isActive) {
    return { valid: false, discountBdt: 0, error: 'Coupon code is invalid or inactive.' };
  }
  if (subtotalBdt < coupon.minSubtotalBdt) {
    return {
      valid: false,
      discountBdt: 0,
      error: `Minimum order subtotal of ৳${coupon.minSubtotalBdt} required for ${coupon.code}.`,
    };
  }
  let discount =
    coupon.discountType === 'percent'
      ? Math.round((subtotalBdt * coupon.value) / 100)
      : Math.round(coupon.value);

  if (typeof coupon.maxDiscountBdt === 'number' && coupon.maxDiscountBdt > 0) {
    discount = Math.min(discount, coupon.maxDiscountBdt);
  }
  discount = Math.min(discount, subtotalBdt);
  return { valid: true, discountBdt: Math.max(0, discount) };
}

export function calculateOrderTotalWithCoupon(params: {
  subtotalBdt: number;
  district: string;
  coupon?: CouponCode;
  freeThresholdBdt?: number;
  dhakaRateBdt?: number;
  outsideRateBdt?: number;
}): {
  subtotalBdt: number;
  discountBdt: number;
  deliveryFeeBdt: number;
  totalBdt: number;
  couponError?: string;
} {
  const couponResult = params.coupon
    ? validateAndApplyCoupon(params.coupon, params.subtotalBdt)
    : { valid: true, discountBdt: 0 };

  const discountedSubtotal = Math.max(0, params.subtotalBdt - couponResult.discountBdt);
  const deliveryFeeBdt = calculateDeliveryChargeBdt(
    params.district,
    discountedSubtotal,
    params.freeThresholdBdt,
    params.dhakaRateBdt,
    params.outsideRateBdt
  );

  return {
    subtotalBdt: params.subtotalBdt,
    discountBdt: couponResult.discountBdt,
    deliveryFeeBdt,
    totalBdt: discountedSubtotal + deliveryFeeBdt,
    couponError: couponResult.error,
  };
}

export interface FeedScoringContext {
  tab: FeedTab;
  category?: string;
  followedIds: string[];
  interestCategories: string[];
  blockedAuthorIds: string[];
  preferredLang: Language;
  nowMs?: number;
}

export function scorePostForFeed(post: PostItem, ctx: FeedScoringContext): number {
  if (post.moderationStatus !== 'approved') return -1;
  if (ctx.blockedAuthorIds.includes(post.authorId)) return -1;
  if (ctx.tab === 'videos' && !post.isVideo) return -1;
  if (ctx.tab === 'following' && !ctx.followedIds.includes(post.authorId)) return -1;
  if (ctx.category && ctx.category !== 'all' && post.category !== ctx.category) return -1;

  const now = ctx.nowMs ?? Date.now();
  const ageHours = Math.max(0, (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
  const freshnessScore = Math.max(0, 48 - ageHours) * 1.4;
  const engagementScore =
    post.likesCount * 1.2 + post.commentsCount * 2.5 + post.savesCount * 2.2 + post.viewsCount * 0.02;
  const followBoost = ctx.followedIds.includes(post.authorId) ? 28 : 0;
  const interestBoost = ctx.interestCategories.includes(post.category) ? 16 : 0;
  const langBoost = post.language === ctx.preferredLang || post.language === 'both' ? 10 : 0;

  if (ctx.tab === 'trending') {
    return engagementScore * 1.6 + freshnessScore * 0.8 + langBoost;
  }
  return engagementScore + freshnessScore + followBoost + interestBoost + langBoost;
}

export function rankAndDiversifyFeed(posts: PostItem[], ctx: FeedScoringContext): PostItem[] {
  const scored = posts
    .map((post) => ({ post, score: scorePostForFeed(post, ctx) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  const result: PostItem[] = [];
  const deferred: PostItem[] = [];

  for (const { post } of scored) {
    const len = result.length;
    const sameLastTwo =
      len >= 2 &&
      result[len - 1].authorId === post.authorId &&
      result[len - 2].authorId === post.authorId;
    if (sameLastTwo) {
      deferred.push(post);
    } else {
      result.push(post);
    }
  }

  return [...result, ...deferred];
}

export function calculateDeliveryChargeBdt(
  district: string,
  subtotalBdt: number,
  freeThresholdBdt = 2500,
  dhakaRateBdt = 60,
  outsideRateBdt = 120
): number {
  if (subtotalBdt >= freeThresholdBdt) return 0;
  const normalized = district.trim().toLowerCase();
  if (normalized === 'dhaka' || normalized === 'ঢাকা') {
    return dhakaRateBdt;
  }
  return outsideRateBdt;
}

export function calculateAffiliateCommission(params: {
  subtotalBdt: number;
  buyerId: string;
  creatorId?: string;
  commissionRatePct?: number;
}): number {
  if (!params.creatorId) return 0;
  if (params.buyerId === params.creatorId) return 0;
  const rate = params.commissionRatePct ?? 5;
  return Math.round((params.subtotalBdt * rate) / 100);
}

export interface CartEntryInput {
  product: ProductItem;
  variant: string;
  quantity: number;
}

export function splitCartIntoSellerOrders(
  entries: CartEntryInput[],
  platformCommissionPct = 8
): {
  subtotalBdt: number;
  subOrders: SellerSubOrder[];
} {
  const bySeller = new Map<string, CartEntryInput[]>();

  for (const entry of entries) {
    if (entry.quantity <= 0) continue;
    const list = bySeller.get(entry.product.sellerId) ?? [];
    list.push(entry);
    bySeller.set(entry.product.sellerId, list);
  }

  let totalSubtotal = 0;
  const subOrders: SellerSubOrder[] = [];
  let idx = 1;

  for (const [sellerId, sellerEntries] of bySeller.entries()) {
    const shopName = sellerEntries[0].product.shopName;
    const items = sellerEntries.map((e) => ({
      productId: e.product.id,
      titleEn: e.product.titleEn,
      titleBn: e.product.titleBn,
      variant: e.variant || e.product.variants[0] || 'Standard',
      quantity: e.quantity,
      unitPriceBdt: e.product.priceBdt,
    }));
    const subtotalBdt = items.reduce((sum, item) => sum + item.unitPriceBdt * item.quantity, 0);
    const commissionBdt = Math.round((subtotalBdt * platformCommissionPct) / 100);
    const sellerNetBdt = subtotalBdt - commissionBdt;
    totalSubtotal += subtotalBdt;

    subOrders.push({
      subOrderId: `sub_${Date.now()}_${idx++}`,
      sellerId,
      shopName,
      items,
      subtotalBdt,
      commissionBdt,
      sellerNetBdt,
      status: 'pending',
    });
  }

  return { subtotalBdt: totalSubtotal, subOrders };
}

export function isSlotAvailable(
  appointments: AppointmentItem[],
  doctorId: string,
  date: string,
  slot: string
): boolean {
  return !appointments.some(
    (appt) =>
      appt.doctorId === doctorId &&
      appt.date === date &&
      appt.slot === slot &&
      appt.status !== 'cancelled'
  );
}

export function calculateBabyAgeMonths(dobIso: string, referenceDate = new Date()): number {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return 0;
  const months =
    (referenceDate.getFullYear() - dob.getFullYear()) * 12 +
    (referenceDate.getMonth() - dob.getMonth()) +
    (referenceDate.getDate() >= dob.getDate() ? 0 : -1);
  return Math.max(0, months);
}

const WHO_MEDIAN_WEIGHT_KG: Record<number, number> = {
  0: 3.3,
  3: 6.1,
  6: 7.6,
  9: 8.6,
  12: 9.3,
  18: 10.6,
  24: 11.8,
};

export function evaluateGrowthBand(ageMonths: number, weightKg: number): {
  band: 'below_reference' | 'within_reference' | 'above_reference';
  referenceMedianKg: number;
} {
  const keys = Object.keys(WHO_MEDIAN_WEIGHT_KG).map(Number).sort((a, b) => a - b);
  let nearest = keys[0];
  for (const k of keys) {
    if (Math.abs(k - ageMonths) <= Math.abs(nearest - ageMonths)) {
      nearest = k;
    }
  }
  const median = WHO_MEDIAN_WEIGHT_KG[nearest];
  if (weightKg < median * 0.78) {
    return { band: 'below_reference', referenceMedianKg: median };
  }
  if (weightKg > median * 1.25) {
    return { band: 'above_reference', referenceMedianKg: median };
  }
  return { band: 'within_reference', referenceMedianKg: median };
}

export function validatePostInput(input: {
  title?: string;
  caption?: string;
  category?: string;
  videoDurationSec?: number;
}): string | null {
  if (!input.title || input.title.trim().length < 3) {
    return 'Title must be at least 3 characters.';
  }
  if (!input.caption || input.caption.trim().length < 5) {
    return 'Caption must be at least 5 characters.';
  }
  if (!input.category || input.category.trim().length < 2) {
    return 'Please select a category.';
  }
  if (typeof input.videoDurationSec === 'number' && input.videoDurationSec > 180) {
    return 'Short video limit is 3 minutes (180 seconds).';
  }
  return null;
}

export function validateOrderInput(input: {
  buyerName?: string;
  phone?: string;
  district?: string;
  upazila?: string;
  area?: string;
  postalCode?: string;
  itemsCount: number;
}): string | null {
  if (input.itemsCount <= 0) return 'Your cart is empty.';
  if (!input.buyerName || input.buyerName.trim().length < 2) return 'Full name is required.';
  if (!input.phone || !/^(\+?880|0)?1[3-9]\d{8}$/.test(input.phone.replace(/\s+/g, ''))) {
    return 'Enter a valid Bangladesh mobile number (e.g. 017XXXXXXXX).';
  }
  if (!input.district?.trim() || !input.upazila?.trim() || !input.area?.trim()) {
    return 'District, Upazila, and Area are required.';
  }
  if (!input.postalCode || input.postalCode.trim().length < 4) {
    return 'Valid postal code is required.';
  }
  return null;
}

export type VideoFeedMode = 'for_you' | 'following' | 'trending';

export function filterVideoPosts<T extends PostItem>(
  posts: T[],
  params: {
    mode: VideoFeedMode;
    category: string;
    preferredLang: Language;
  },
  isFollowingAuthor?: (post: T) => boolean
): T[] {
  const onlyVideos = posts.filter((p) => p.isVideo && p.moderationStatus === 'approved');
  const byCategory =
    params.category && params.category !== 'all'
      ? onlyVideos.filter((p) => p.category === params.category)
      : onlyVideos;

  const filtered =
    params.mode === 'following'
      ? byCategory.filter((p) => (isFollowingAuthor ? isFollowingAuthor(p) : false))
      : byCategory;

  return [...filtered].sort((a, b) => {
    const scoreA =
      a.likesCount * 1.3 + a.commentsCount * 2.4 + a.savesCount * 2.1 + a.viewsCount * 0.025;
    const scoreB =
      b.likesCount * 1.3 + b.commentsCount * 2.4 + b.savesCount * 2.1 + b.viewsCount * 0.025;
    if (params.mode === 'trending') {
      return scoreB - scoreA;
    }
    const langBoostA = a.language === params.preferredLang || a.language === 'both' ? 12 : 0;
    const langBoostB = b.language === params.preferredLang || b.language === 'both' ? 12 : 0;
    const timeA = new Date(a.createdAt).getTime() || 0;
    const timeB = new Date(b.createdAt).getTime() || 0;
    return scoreB + langBoostB + timeB * 1e-10 - (scoreA + langBoostA + timeA * 1e-10);
  });
}

export function getAdjacentVideoIndices(currentIndex: number, total: number): number[] {
  if (total <= 1) return [];
  const indices: number[] = [];
  if (currentIndex + 1 < total) indices.push(currentIndex + 1);
  if (currentIndex - 1 >= 0) indices.push(currentIndex - 1);
  return indices;
}

export function toggleCompareProductIds(
  currentIds: string[],
  productId: string,
  maxItems = 3
): { ids: string[]; limitReached: boolean } {
  if (currentIds.includes(productId)) {
    return { ids: currentIds.filter((id) => id !== productId), limitReached: false };
  }
  if (currentIds.length >= maxItems) {
    return { ids: currentIds, limitReached: true };
  }
  return { ids: [...currentIds, productId], limitReached: false };
}

export function isVideoMediaUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('/videos/') ||
    url.startsWith('/uploads/videos/') ||
    url.startsWith('data:video/') ||
    /\.(mp4|mov|webm)(\?|#|$)/i.test(url)
  );
}

export function resolveVideoMedia(
  mediaUrls: string[] = [],
  fallbackPoster = '/src/assets/images/feed_mother_newborn_1794921207230.jpg'
): { videoSrc: string | null; posterSrc: string } {
  const videoSrc = mediaUrls.find((u) => isVideoMediaUrl(u)) ?? null;
  const posterSrc = mediaUrls.find((u) => u && !isVideoMediaUrl(u)) ?? fallbackPoster;
  return { videoSrc, posterSrc };
}

export function toggleGuideBookmark(savedIds: string[], guideId: string): string[] {
  if (savedIds.includes(guideId)) {
    return savedIds.filter((id) => id !== guideId);
  }
  return [guideId, ...savedIds];
}

export function filterGuidesByTopic(
  guides: GuideArticle[],
  topic: string,
  query: string,
  savedOnly = false,
  savedIds: string[] = []
): GuideArticle[] {
  const q = query.trim().toLowerCase();
  return guides.filter((art) => {
    if (savedOnly && !savedIds.includes(art.id)) return false;
    if (topic !== 'all') {
      const matchesCat = art.category === topic;
      const matchesTopic = art.topicKey === topic;
      if (!matchesCat && !matchesTopic) return false;
    }
    if (!q) return true;
    return (
      art.titleEn.toLowerCase().includes(q) ||
      art.titleBn.toLowerCase().includes(q) ||
      art.summaryEn.toLowerCase().includes(q) ||
      art.summaryBn.toLowerCase().includes(q)
    );
  });
}

export function validateBabyReminderInput(input: {
  title?: string;
  dueDate?: string;
}): string | null {
  if (!input.title || input.title.trim().length < 2) {
    return 'Reminder title must be at least 2 characters.';
  }
  if (!input.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate.trim())) {
    return 'Valid due date (YYYY-MM-DD) is required.';
  }
  return null;
}


