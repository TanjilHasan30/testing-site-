import type {
  AgeGroupKey,
  AppointmentItem,
  BabyProfile,
  DoctorProfile,
  ProductItem,
} from '../types/platform';
import { calculateBabyAgeMonths, calculateProductDiscountPct, isSlotAvailable } from './domain';

export type DetectedLanguage = 'bn' | 'en' | 'banglish';

const BANGLISH_HINTS = [
  'amar',
  'amader',
  'apnar',
  'tumi',
  'ami',
  'baccha',
  'bacchar',
  'shishu',
  'koto',
  'taka',
  'takar',
  'moddhe',
  'lagbe',
  'chai',
  'dao',
  'den',
  'kono',
  'valobashi',
  'valo',
  'bhalo',
  'khabar',
  'dibo',
  'kinbo',
  'kinte',
  'dekhabo',
  'daktar',
  'doctor',
  'masher',
  'maasher',
  'bochor',
  'jonno',
  'ar',
  'ebong',
  'ki',
  'keno',
  'kivabe',
  'kothay',
  'nibo',
  'ache',
  'ase',
  'nai',
  'parbo',
  'bolen',
  'bolo',
  'please',
  'suggest',
];

export function detectInputLanguage(text: string): DetectedLanguage {
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn';
  }
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let banglishHits = 0;
  for (const tok of tokens) {
    if (BANGLISH_HINTS.includes(tok)) {
      banglishHits += 1;
    }
  }
  if (banglishHits >= 2) {
    return 'banglish';
  }
  return 'en';
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  ageGroup?: AgeGroupKey | string;
  maxPriceBdt?: number;
  minPriceBdt?: number;
  inStockOnly?: boolean;
  limit?: number;
}

export function queryCatalogProducts(
  products: ProductItem[],
  params: ProductSearchParams = {}
): ProductItem[] {
  const {
    query = '',
    category,
    ageGroup,
    maxPriceBdt,
    minPriceBdt,
    inStockOnly = true,
    limit = 6,
  } = params;

  const qTerms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const scored = products
    .filter((p) => p.moderationStatus === 'approved')
    .filter((p) => (!inStockOnly ? true : p.stock > 0))
    .filter((p) => {
      if (!category || category === 'all') return true;
      return p.category.toLowerCase() === category.toLowerCase();
    })
    .filter((p) => {
      if (!ageGroup || ageGroup === 'all') return true;
      return (p.ageGroups ?? []).includes(ageGroup as AgeGroupKey);
    })
    .filter((p) => {
      if (typeof maxPriceBdt === 'number' && maxPriceBdt > 0 && p.priceBdt > maxPriceBdt) {
        return false;
      }
      if (typeof minPriceBdt === 'number' && minPriceBdt > 0 && p.priceBdt < minPriceBdt) {
        return false;
      }
      return true;
    })
    .map((p) => {
      let score = p.rating * 10 + Math.min(20, p.reviewsCount * 0.2);
      if (p.collectionTags?.includes('best_seller')) score += 6;
      if (p.collectionTags?.includes('trending')) score += 4;
      if (qTerms.length > 0) {
        const haystack = [
          p.titleEn,
          p.titleBn,
          p.descriptionEn,
          p.descriptionBn,
          p.category,
          p.subCategory ?? '',
          p.brandName ?? '',
          p.shopName,
          ...(p.ageGroups ?? []),
        ]
          .join(' ')
          .toLowerCase();
        let hits = 0;
        for (const term of qTerms) {
          if (haystack.includes(term)) hits += 1;
        }
        if (hits === 0) return { product: p, score: -1 };
        score += hits * 35;
      }
      return { product: p, score };
    })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, Math.max(1, Math.min(12, limit))).map((e) => e.product);
}

export interface ProductComparisonItem {
  id: string;
  titleEn: string;
  titleBn: string;
  priceBdt: number;
  compareAtBdt?: number;
  discountPct: number;
  rating: number;
  reviewsCount: number;
  stock: number;
  ageGroups: AgeGroupKey[];
  shopName: string;
  brandName?: string;
  safetyInfoEn?: string;
  safetyInfoBn?: string;
  variants: string[];
  imageUrl: string;
}

export function buildProductComparison(
  products: ProductItem[],
  productIds: string[]
): ProductComparisonItem[] {
  const uniqueIds = Array.from(new Set(productIds)).slice(0, 4);
  const resolved: ProductComparisonItem[] = [];

  for (const id of uniqueIds) {
    const p = products.find((item) => item.id === id && item.moderationStatus === 'approved');
    if (!p) continue;
    resolved.push({
      id: p.id,
      titleEn: p.titleEn,
      titleBn: p.titleBn,
      priceBdt: p.priceBdt,
      compareAtBdt: p.compareAtBdt,
      discountPct: calculateProductDiscountPct(p.priceBdt, p.compareAtBdt),
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      stock: p.stock,
      ageGroups: p.ageGroups ?? [],
      shopName: p.shopName,
      brandName: p.brandName,
      safetyInfoEn: p.safetyInfoEn,
      safetyInfoBn: p.safetyInfoBn,
      variants: p.variants,
      imageUrl: p.imageUrl,
    });
  }

  return resolved;
}

export interface ShoppingListEntry {
  productId: string;
  titleEn: string;
  titleBn: string;
  priceBdt: number;
  variant: string;
  imageUrl: string;
  category: string;
  reasonEn: string;
  reasonBn: string;
}

export interface ShoppingListBundle {
  titleEn: string;
  titleBn: string;
  budgetBdt?: number;
  totalBdt: number;
  qualifiesForFreeDelivery: boolean;
  items: ShoppingListEntry[];
}

export function buildBudgetShoppingList(
  products: ProductItem[],
  options: {
    goal?: string;
    ageGroup?: AgeGroupKey | string;
    budgetBdt?: number;
    categories?: string[];
    freeDeliveryThresholdBdt?: number;
  }
): ShoppingListBundle {
  const threshold = options.freeDeliveryThresholdBdt ?? 2500;
  const maxBudget = typeof options.budgetBdt === 'number' && options.budgetBdt > 0 ? options.budgetBdt : Infinity;

  let candidates = products.filter((p) => p.moderationStatus === 'approved' && p.stock > 0);
  if (options.ageGroup && options.ageGroup !== 'all') {
    const stageMatches = candidates.filter((p) => p.ageGroups?.includes(options.ageGroup as AgeGroupKey));
    if (stageMatches.length > 0) candidates = stageMatches;
  }
  if (options.categories && options.categories.length > 0) {
    const catSet = new Set(options.categories.map((c) => c.toLowerCase()));
    const catMatches = candidates.filter((p) => catSet.has(p.category.toLowerCase()));
    if (catMatches.length > 0) candidates = catMatches;
  }

  // Prefer higher rated & lower price when building a budget list so more essentials fit
  const sorted = [...candidates].sort((a, b) => {
    if (Number.isFinite(maxBudget)) {
      return a.priceBdt - b.priceBdt || b.rating - a.rating;
    }
    return b.rating - a.rating || a.priceBdt - b.priceBdt;
  });

  const picked: ShoppingListEntry[] = [];
  const usedCategories = new Set<string>();
  let runningTotal = 0;

  // First pass: pick one top essential per distinct category within budget
  for (const p of sorted) {
    if (picked.length >= 6) break;
    if (usedCategories.has(p.category)) continue;
    if (runningTotal + p.priceBdt > maxBudget) continue;
    usedCategories.add(p.category);
    runningTotal += p.priceBdt;
    picked.push({
      productId: p.id,
      titleEn: p.titleEn,
      titleBn: p.titleBn,
      priceBdt: p.priceBdt,
      variant: p.variants[0] || 'Standard',
      imageUrl: p.imageUrl,
      category: p.category,
      reasonEn: `Top-rated ${p.category.replace(/_/g, ' ')} essential`,
      reasonBn: `সেরা রেটিংপ্রাপ্ত জরুরি পণ্য`,
    });
  }

  // Second pass: fill remaining slots if budget allows
  for (const p of sorted) {
    if (picked.length >= 5) break;
    if (picked.some((item) => item.productId === p.id)) continue;
    if (runningTotal + p.priceBdt > maxBudget) continue;
    runningTotal += p.priceBdt;
    picked.push({
      productId: p.id,
      titleEn: p.titleEn,
      titleBn: p.titleBn,
      priceBdt: p.priceBdt,
      variant: p.variants[0] || 'Standard',
      imageUrl: p.imageUrl,
      category: p.category,
      reasonEn: `Complementary care essential`,
      reasonBn: `সহায়ক কেয়ার পণ্য`,
    });
  }

  const label = options.goal?.trim() || (options.ageGroup ? `${options.ageGroup} Care` : 'Mother & Baby Essentials');
  return {
    titleEn: `${label} Shopping List`,
    titleBn: `${label} — শপিং তালিকা`,
    budgetBdt: Number.isFinite(maxBudget) ? maxBudget : undefined,
    totalBdt: runningTotal,
    qualifiesForFreeDelivery: runningTotal >= threshold,
    items: picked,
  };
}

export interface DoctorWithSlots {
  doctor: DoctorProfile;
  openSlots: string[];
  date: string;
}

export function findMatchingDoctors(
  doctors: DoctorProfile[],
  appointments: AppointmentItem[],
  params: { specialisation?: string; query?: string; date?: string } = {}
): DoctorWithSlots[] {
  const targetDate = params.date || new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 10);
  const spec = (params.specialisation || '').trim().toLowerCase();
  const q = (params.query || '').trim().toLowerCase();

  return doctors
    .filter((doc) => {
      if (spec && spec !== 'all' && !doc.specialisation.toLowerCase().includes(spec)) {
        return false;
      }
      if (q) {
        const hay = `${doc.nameEn} ${doc.nameBn} ${doc.specialisation} ${doc.hospitalEn} ${doc.hospitalBn} ${doc.qualifications}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    })
    .map((doctor) => ({
      doctor,
      date: targetDate,
      openSlots: doctor.availableSlots.filter((slot) =>
        isSlotAvailable(appointments, doctor.id, targetDate, slot)
      ),
    }));
}

export function summarizeBabiesForPrompt(babies: BabyProfile[]): string {
  if (!babies || babies.length === 0) return 'No child profile added yet.';
  return babies
    .map((b) => {
      const ageMonths = calculateBabyAgeMonths(b.dob);
      const pendingVaccines = b.vaccinations.filter((v) => v.status === 'pending').map((v) => v.vaccineNameEn);
      const latestLog = b.logs[b.logs.length - 1];
      return `${b.name} (${ageMonths} months old, gender: ${b.gender}${
        latestLog ? `, latest weight: ${latestLog.weightKg}kg, height: ${latestLog.heightCm}cm` : ''
      }${pendingVaccines.length > 0 ? `, pending EPI vaccines: ${pendingVaccines.join(', ')}` : ''})`;
    })
    .join('; ');
}

export interface ChatTurnInput {
  role: 'user' | 'assistant';
  text: string;
}

export function sanitizeChatHistory(history: unknown): ChatTurnInput[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (item): item is ChatTurnInput =>
        Boolean(item) &&
        typeof item === 'object' &&
        ((item as ChatTurnInput).role === 'user' || (item as ChatTurnInput).role === 'assistant') &&
        typeof (item as ChatTurnInput).text === 'string' &&
        (item as ChatTurnInput).text.trim().length > 0
    )
    .slice(-14)
    .map((item) => ({
      role: item.role,
      text: item.text.trim().slice(0, 2000),
    }));
}
