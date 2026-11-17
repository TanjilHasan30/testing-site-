import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAffiliateCommission,
  calculateBabyAgeMonths,
  calculateDeliveryChargeBdt,
  calculateOrderTotalWithCoupon,
  calculateProductDiscountPct,
  evaluateGrowthBand,
  filterGuidesByTopic,
  filterVideoPosts,
  formatBdt,
  getAdjacentVideoIndices,
  getAgeGroupFromMonths,
  isSlotAvailable,
  isVideoMediaUrl,
  matchProductsForBaby,
  rankAndDiversifyFeed,
  resolveVideoMedia,
  splitCartIntoSellerOrders,
  toggleCompareProductIds,
  toggleGuideBookmark,
  validateAndApplyCoupon,
  validateBabyReminderInput,
  validateOrderInput,
  validatePostInput,
} from './domain';
import type { AppointmentItem, CouponCode, GuideArticle, PostItem, ProductItem } from '../types/platform';

const basePost = (overrides: Partial<PostItem>): PostItem => ({
  id: 'p1',
  authorId: 'u1',
  authorName: 'Nadia',
  authorUsername: 'nadia',
  authorAvatar: '',
  type: 'photo',
  category: 'baby_care',
  titleEn: 'Title',
  titleBn: 'শিরোনাম',
  captionEn: 'Caption text here',
  captionBn: 'ক্যাপশন',
  mediaUrls: [],
  aspectRatio: '3:4',
  isVideo: false,
  hashtags: [],
  taggedProductIds: [],
  isSponsored: false,
  language: 'both',
  moderationStatus: 'approved',
  likesCount: 10,
  commentsCount: 2,
  savesCount: 3,
  viewsCount: 100,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const baseProduct = (overrides: Partial<ProductItem> = {}): ProductItem => ({
  id: 'pr1',
  sellerId: 's1',
  shopSlug: 'dhaka-baby',
  shopName: 'Dhaka Baby',
  category: 'baby_clothing',
  ageGroups: ['newborn'],
  titleEn: 'Muslin Swaddle',
  titleBn: 'মসলিন কাঁথা',
  descriptionEn: 'Soft',
  descriptionBn: 'নরম',
  priceBdt: 500,
  stock: 10,
  variants: ['Cream'],
  imageUrl: '',
  rating: 4.9,
  reviewsCount: 12,
  moderationStatus: 'approved',
  ...overrides,
});

test('formatBdt formats Bengali and English currency cleanly', () => {
  assert.equal(formatBdt(1250, 'en'), '৳1,250');
  assert.equal(formatBdt(1250, 'bn'), '৳১,২৫০');
});

test('calculateProductDiscountPct calculates accurate discount percentage', () => {
  assert.equal(calculateProductDiscountPct(1350, 1650), 18);
  assert.equal(calculateProductDiscountPct(1000, 1000), 0);
  assert.equal(calculateProductDiscountPct(1000), 0);
});

test('getAgeGroupFromMonths and matchProductsForBaby personalize product recommendations', () => {
  assert.equal(getAgeGroupFromMonths(1), 'newborn');
  assert.equal(getAgeGroupFromMonths(6), 'infant');
  assert.equal(getAgeGroupFromMonths(24), 'toddler');
  assert.equal(getAgeGroupFromMonths(48), 'preschool');
  assert.equal(getAgeGroupFromMonths(72), 'kids');

  const items = [
    baseProduct({ id: 'p_newborn', ageGroups: ['newborn'] }),
    baseProduct({ id: 'p_infant', ageGroups: ['infant'] }),
  ];
  const matched = matchProductsForBaby(items, 6);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].id, 'p_infant');
});

test('validateAndApplyCoupon and calculateOrderTotalWithCoupon enforce rules and caps', () => {
  const coupon: CouponCode = {
    code: 'WELCOME10',
    discountType: 'percent',
    value: 10,
    minSubtotalBdt: 1000,
    maxDiscountBdt: 250,
    descriptionEn: '10% off',
    descriptionBn: '১০% ছাড়',
    isActive: true,
  };

  assert.equal(validateAndApplyCoupon(coupon, 800).valid, false);
  assert.equal(validateAndApplyCoupon(coupon, 1500).discountBdt, 150);
  assert.equal(validateAndApplyCoupon(coupon, 4000).discountBdt, 250);

  const summary = calculateOrderTotalWithCoupon({
    subtotalBdt: 2000,
    district: 'Dhaka',
    coupon,
  });
  assert.equal(summary.discountBdt, 200);
  assert.equal(summary.deliveryFeeBdt, 60);
  assert.equal(summary.totalBdt, 1860);
});

test('rankAndDiversifyFeed excludes removed/blocked posts and throttles creator repetition', () => {
  const posts: PostItem[] = [
    basePost({ id: '1', authorId: 'a1', likesCount: 200 }),
    basePost({ id: '2', authorId: 'a1', likesCount: 180 }),
    basePost({ id: '3', authorId: 'a1', likesCount: 170 }),
    basePost({ id: '4', authorId: 'a2', likesCount: 50 }),
    basePost({ id: '5', authorId: 'a3', moderationStatus: 'removed', likesCount: 999 }),
  ];

  const ranked = rankAndDiversifyFeed(posts, {
    tab: 'discover',
    followedIds: [],
    interestCategories: ['baby_care'],
    blockedAuthorIds: [],
    preferredLang: 'bn',
  });

  assert.equal(ranked.some((p) => p.id === '5'), false);
  assert.equal(ranked[0].authorId, 'a1');
  assert.equal(ranked[1].authorId, 'a1');
  assert.equal(ranked[2].authorId, 'a2');
});

test('calculateDeliveryChargeBdt applies Dhaka vs nationwide rates and free threshold', () => {
  assert.equal(calculateDeliveryChargeBdt('Dhaka', 1000), 60);
  assert.equal(calculateDeliveryChargeBdt('Chattogram', 1000), 120);
  assert.equal(calculateDeliveryChargeBdt('Sylhet', 2500), 0);
});

test('splitCartIntoSellerOrders groups items by seller and calculates commissions', () => {
  const prodA = baseProduct({ id: 'pr1', sellerId: 's1', priceBdt: 500 });
  const prodB = baseProduct({ id: 'pr2', sellerId: 's2', shopSlug: 'nurture-bd', shopName: 'Nurture BD', priceBdt: 800 });

  const result = splitCartIntoSellerOrders(
    [
      { product: prodA, variant: 'Cream', quantity: 2 },
      { product: prodB, variant: 'Sage', quantity: 1 },
    ],
    10
  );

  assert.equal(result.subtotalBdt, 1800);
  assert.equal(result.subOrders.length, 2);
  assert.equal(result.subOrders[0].commissionBdt, 100);
  assert.equal(result.subOrders[0].sellerNetBdt, 900);
});

test('calculateAffiliateCommission blocks self-referrals', () => {
  assert.equal(
    calculateAffiliateCommission({ subtotalBdt: 1000, buyerId: 'u1', creatorId: 'u1' }),
    0
  );
  assert.equal(
    calculateAffiliateCommission({ subtotalBdt: 1000, buyerId: 'u1', creatorId: 'u2', commissionRatePct: 6 }),
    60
  );
});

test('isSlotAvailable prevents double booking unless prior booking is cancelled', () => {
  const existing: AppointmentItem[] = [
    {
      id: 'app1',
      patientId: 'u1',
      patientName: 'Sadia',
      doctorId: 'doc1',
      doctorName: 'Dr. Farhana',
      date: '2026-11-20',
      slot: '10:30 AM',
      consultationType: 'video',
      feeBdt: 800,
      paymentMethod: 'bkash_sandbox',
      paymentStatus: 'paid_sandbox',
      status: 'confirmed',
      createdAt: '2026-11-17T00:00:00Z',
    },
    {
      id: 'app2',
      patientId: 'u2',
      patientName: 'Rima',
      doctorId: 'doc1',
      doctorName: 'Dr. Farhana',
      date: '2026-11-20',
      slot: '11:00 AM',
      consultationType: 'video',
      feeBdt: 800,
      paymentMethod: 'bkash_sandbox',
      paymentStatus: 'refunded',
      status: 'cancelled',
      createdAt: '2026-11-17T00:00:00Z',
    },
  ];

  assert.equal(isSlotAvailable(existing, 'doc1', '2026-11-20', '10:30 AM'), false);
  assert.equal(isSlotAvailable(existing, 'doc1', '2026-11-20', '11:00 AM'), true);
});

test('baby age calculation and growth reference bands', () => {
  const months = calculateBabyAgeMonths('2026-05-17', new Date('2026-11-17T00:00:00Z'));
  assert.equal(months, 6);
  const band = evaluateGrowthBand(6, 7.7);
  assert.equal(band.band, 'within_reference');
});

test('input validation rejects invalid posts and BD phone numbers', () => {
  assert.ok(validatePostInput({ title: 'Hi', caption: 'valid caption', category: 'baby_care' }));
  assert.equal(
    validatePostInput({ title: 'Baby sleep', caption: 'Gentle routine works great', category: 'baby_care' }),
    null
  );
  assert.ok(
    validateOrderInput({
      buyerName: 'Tahmina',
      phone: '12345',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      area: 'Road 7',
      postalCode: '1205',
      itemsCount: 1,
    })
  );
  assert.equal(
    validateOrderInput({
      buyerName: 'Tahmina',
      phone: '01712345678',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      area: 'Road 7',
      postalCode: '1205',
      itemsCount: 1,
    }),
    null
  );
});

test('filterVideoPosts filters by mode and category and sorts trending correctly', () => {
  const v1 = basePost({ id: 'v1', isVideo: true, category: 'baby_food', likesCount: 50, viewsCount: 400 });
  const v2 = basePost({ id: 'v2', isVideo: true, category: 'newborn', likesCount: 400, viewsCount: 5000 });
  const photo = basePost({ id: 'p_img', isVideo: false, category: 'newborn', likesCount: 999 });

  const trendingAll = filterVideoPosts([v1, v2, photo], {
    mode: 'trending',
    category: 'all',
    preferredLang: 'bn',
  });
  assert.equal(trendingAll.length, 2);
  assert.equal(trendingAll[0].id, 'v2');

  const foodOnly = filterVideoPosts([v1, v2, photo], {
    mode: 'for_you',
    category: 'baby_food',
    preferredLang: 'bn',
  });
  assert.equal(foodOnly.length, 1);
  assert.equal(foodOnly[0].id, 'v1');

  const followedOnly = filterVideoPosts(
    [v1, v2],
    { mode: 'following', category: 'all', preferredLang: 'bn' },
    (p) => p.id === 'v1'
  );
  assert.deepEqual(
    followedOnly.map((v) => v.id),
    ['v1']
  );
});

test('getAdjacentVideoIndices returns safe preload indices', () => {
  assert.deepEqual(getAdjacentVideoIndices(0, 5), [1]);
  assert.deepEqual(getAdjacentVideoIndices(2, 5), [3, 1]);
  assert.deepEqual(getAdjacentVideoIndices(4, 5), [3]);
  assert.deepEqual(getAdjacentVideoIndices(0, 1), []);
});

test('toggleCompareProductIds enforces max selection limit and toggles cleanly', () => {
  const s1 = toggleCompareProductIds([], 'prod_1', 3);
  assert.deepEqual(s1, { ids: ['prod_1'], limitReached: false });

  const s2 = toggleCompareProductIds(['prod_1', 'prod_2', 'prod_3'], 'prod_4', 3);
  assert.deepEqual(s2, { ids: ['prod_1', 'prod_2', 'prod_3'], limitReached: true });

  const s3 = toggleCompareProductIds(['prod_1', 'prod_2'], 'prod_1', 3);
  assert.deepEqual(s3, { ids: ['prod_2'], limitReached: false });
});

test('isVideoMediaUrl and resolveVideoMedia separate real video streams from poster images', () => {
  assert.equal(isVideoMediaUrl('/videos/newborn.mp4'), true);
  assert.equal(isVideoMediaUrl('/uploads/videos/clip_1.webm'), true);
  assert.equal(isVideoMediaUrl('/src/assets/images/feed_mother_newborn_1794921207230.jpg'), false);

  const resolved = resolveVideoMedia([
    '/videos/newborn.mp4',
    '/src/assets/images/feed_mother_newborn_1794921207230.jpg',
  ]);
  assert.equal(resolved.videoSrc, '/videos/newborn.mp4');
  assert.equal(resolved.posterSrc, '/src/assets/images/feed_mother_newborn_1794921207230.jpg');

  const imageOnly = resolveVideoMedia(['/src/assets/images/feed_baby_food_1794921207142.jpg']);
  assert.equal(imageOnly.videoSrc, null);
  assert.equal(imageOnly.posterSrc, '/src/assets/images/feed_baby_food_1794921207142.jpg');
});

test('toggleGuideBookmark, filterGuidesByTopic, and validateBabyReminderInput behave accurately', () => {
  const saved1 = toggleGuideBookmark([], 'guide_5');
  assert.deepEqual(saved1, ['guide_5']);
  const saved2 = toggleGuideBookmark(saved1, 'guide_5');
  assert.deepEqual(saved2, []);

  const guides: GuideArticle[] = [
    {
      id: 'g1',
      slug: 'week-by-week',
      category: 'pregnancy',
      topicKey: 'pregnancy-week-by-week',
      titleEn: 'Pregnancy Week by Week',
      titleBn: 'সপ্তাহভিত্তিক গর্ভাবস্থা',
      summaryEn: 'Weekly baby growth guide',
      summaryBn: 'সাপ্তাহিক গাইড',
      bodyEn: 'Body',
      bodyBn: 'বডি',
      authorName: 'Editorial',
      isMedicallyReviewed: true,
      references: [],
      imageUrl: '',
      readTimeMin: 5,
      publishedAt: '2026-11-01',
      updatedAt: '2026-11-15',
    },
    {
      id: 'g2',
      slug: 'breastfeeding',
      category: 'mother_care',
      topicKey: 'breastfeeding',
      titleEn: 'Breastfeeding Guide',
      titleBn: 'ব্রেস্টফিডিং গাইড',
      summaryEn: 'Latch tips',
      summaryBn: 'টিপস',
      bodyEn: 'Body',
      bodyBn: 'বডি',
      authorName: 'Editorial',
      isMedicallyReviewed: true,
      references: [],
      imageUrl: '',
      readTimeMin: 4,
      publishedAt: '2026-11-01',
      updatedAt: '2026-11-15',
    },
  ];

  assert.equal(filterGuidesByTopic(guides, 'pregnancy-week-by-week', '', false, []).length, 1);
  assert.equal(filterGuidesByTopic(guides, 'all', 'latch', false, []).length, 1);
  assert.equal(filterGuidesByTopic(guides, 'all', '', true, ['g2']).map((g) => g.id).join(','), 'g2');

  assert.ok(validateBabyReminderInput({ title: 'A', dueDate: '2026-12-01' }));
  assert.ok(validateBabyReminderInput({ title: 'MR-1 Vaccine', dueDate: 'invalid-date' }));
  assert.equal(validateBabyReminderInput({ title: 'MR-1 Vaccine', dueDate: '2026-12-01' }), null);
});


