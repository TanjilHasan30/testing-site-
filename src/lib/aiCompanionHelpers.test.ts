import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBudgetShoppingList,
  buildProductComparison,
  detectInputLanguage,
  findMatchingDoctors,
  queryCatalogProducts,
  sanitizeChatHistory,
} from './aiCompanionHelpers';
import type { AppointmentItem, DoctorProfile, ProductItem } from '../types/platform';

const makeProduct = (overrides: Partial<ProductItem>): ProductItem => ({
  id: 'p1',
  sellerId: 's1',
  shopSlug: 'nurture-bd',
  shopName: 'Nurture Baby BD',
  brandName: 'Nurture Baby BD',
  category: 'baby_skincare',
  ageGroups: ['newborn', 'infant'],
  titleEn: 'Gentle Baby Lotion',
  titleBn: 'শিশুর কোমল লোশন',
  descriptionEn: 'Fragrance-free organic baby lotion',
  descriptionBn: 'সুগন্ধিবিহীন অর্গানিক লোশন',
  priceBdt: 650,
  compareAtBdt: 800,
  stock: 12,
  variants: ['200ml'],
  imageUrl: '/img/lotion.jpg',
  rating: 4.8,
  reviewsCount: 34,
  moderationStatus: 'approved',
  ...overrides,
});

const makeDoctor = (overrides: Partial<DoctorProfile> = {}): DoctorProfile => ({
  id: 'doc_1',
  userId: 'u_doc_1',
  nameEn: 'Dr. Farhana Rahman',
  nameBn: 'ডা. ফারহানা রহমান',
  specialisation: 'Paediatrician',
  qualifications: 'MBBS, FCPS (Paediatrics)',
  bmdcRegNote: 'BMDC Demo #A-45821',
  experienceYears: 11,
  hospitalEn: 'Dhaka Shishu Care Clinic',
  hospitalBn: 'ঢাকা শিশু কেয়ার ক্লিনিক',
  consultationFeeBdt: 800,
  languages: ['Bengali', 'English'],
  avatarUrl: '/img/doc.jpg',
  isVerified: true,
  availableSlots: ['10:00 AM', '11:30 AM', '05:00 PM'],
  rating: 4.9,
  reviewsCount: 120,
  ...overrides,
});

test('detectInputLanguage accurately identifies Bengali, Banglish, and English', () => {
  assert.equal(detectInputLanguage('আমার ৩ মাসের বাচ্চার জন্য ডায়াপার সাজেশন দাও'), 'bn');
  assert.equal(detectInputLanguage('Amar 6 masher bacchar jonno 1500 takar moddhe gift dao'), 'banglish');
  assert.equal(detectInputLanguage('Recommend a gentle lotion for newborn skin under 1000 BDT'), 'en');
});

test('queryCatalogProducts filters by budget, age group, stock, and query terms', () => {
  const catalog = [
    makeProduct({ id: 'p_lotion', priceBdt: 650, category: 'baby_skincare', ageGroups: ['newborn', 'infant'] }),
    makeProduct({
      id: 'p_stroller',
      titleEn: 'Compact Travel Stroller',
      category: 'baby_gear',
      ageGroups: ['infant', 'toddler'],
      priceBdt: 8500,
    }),
    makeProduct({ id: 'p_oos', titleEn: 'Out of Stock Lotion', stock: 0, priceBdt: 400 }),
  ];

  const underBudget = queryCatalogProducts(catalog, { maxPriceBdt: 1000, ageGroup: 'newborn' });
  assert.equal(underBudget.length, 1);
  assert.equal(underBudget[0].id, 'p_lotion');

  const gearResults = queryCatalogProducts(catalog, { query: 'stroller' });
  assert.equal(gearResults.length, 1);
  assert.equal(gearResults[0].id, 'p_stroller');
});

test('buildProductComparison builds strict comparison entries only for existing approved products', () => {
  const catalog = [
    makeProduct({ id: 'p1', priceBdt: 600, compareAtBdt: 750 }),
    makeProduct({ id: 'p2', titleEn: 'Soft Muslin Swaddle', priceBdt: 950, category: 'baby_clothing' }),
  ];

  const comparison = buildProductComparison(catalog, ['p1', 'p2', 'non_existent']);
  assert.equal(comparison.length, 2);
  assert.equal(comparison[0].discountPct, 20);
  assert.equal(comparison[1].discountPct, 0);
});

test('buildBudgetShoppingList respects budget ceiling and computes free delivery status', () => {
  const catalog = [
    makeProduct({ id: 'p1', category: 'baby_skincare', priceBdt: 500 }),
    makeProduct({ id: 'p2', category: 'diapers_wipes', titleEn: 'Organic Diaper Pack', priceBdt: 900 }),
    makeProduct({ id: 'p3', category: 'baby_clothing', titleEn: 'Cotton Romper Set', priceBdt: 750 }),
    makeProduct({ id: 'p4', category: 'baby_gear', titleEn: 'Baby Stroller', priceBdt: 9500 }),
  ];

  const list = buildBudgetShoppingList(catalog, { budgetBdt: 1500, goal: 'Newborn Essentials' });
  assert.ok(list.totalBdt <= 1500);
  assert.ok(list.items.length >= 2);
  assert.equal(list.qualifiesForFreeDelivery, false);

  const bigList = buildBudgetShoppingList(catalog, { budgetBdt: 12000, goal: 'Complete Kit' });
  assert.equal(bigList.qualifiesForFreeDelivery, true);
});

test('findMatchingDoctors excludes already-booked slots for the requested date', () => {
  const docs = [
    makeDoctor({ id: 'doc_1', specialisation: 'Paediatrician' }),
    makeDoctor({ id: 'doc_2', nameEn: 'Dr. Nusrat', specialisation: 'Gynaecologist' }),
  ];
  const appts: AppointmentItem[] = [
    {
      id: 'a1',
      patientId: 'u1',
      patientName: 'Sadia',
      doctorId: 'doc_1',
      doctorName: 'Dr. Farhana',
      date: '2026-11-25',
      slot: '10:00 AM',
      consultationType: 'video',
      feeBdt: 800,
      paymentMethod: 'bkash_sandbox',
      paymentStatus: 'paid_sandbox',
      status: 'confirmed',
      createdAt: '2026-11-17T00:00:00Z',
    },
  ];

  const found = findMatchingDoctors(docs, appts, {
    specialisation: 'Paediatrician',
    date: '2026-11-25',
  });
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].openSlots, ['11:30 AM', '05:00 PM']);
});

test('sanitizeChatHistory trims invalid entries and keeps last 14 turns', () => {
  const raw = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    text: `Message ${i}`,
  }));
  const cleaned = sanitizeChatHistory([...raw, { role: 'system', text: 'bad' }, { role: 'user', text: '   ' }]);
  assert.equal(cleaned.length, 14);
  assert.equal(cleaned[0].text, 'Message 6');
});
