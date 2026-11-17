import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Content,
  type FunctionDeclaration,
} from '@google/genai';
import {
  buildBudgetShoppingList,
  buildProductComparison,
  detectInputLanguage,
  findMatchingDoctors,
  queryCatalogProducts,
  sanitizeChatHistory,
  summarizeBabiesForPrompt,
  type DoctorWithSlots,
  type ProductComparisonItem,
  type ShoppingListBundle,
} from '../lib/aiCompanionHelpers.ts';
import type { CouponCode, GuideArticle, Language, ProductItem } from '../types/platform.ts';
import { getDb } from './store.ts';

export class AiServiceError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 500, code = 'AI_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface CompanionPageContext {
  routePath?: string;
  activeProductId?: string;
  activeDoctorId?: string;
  preferredLang?: Language;
  cartCount?: number;
  wishlistCount?: number;
}

export interface CompanionResponsePayload {
  reply: string;
  detectedLanguage: 'bn' | 'en' | 'banglish';
  products: ProductItem[];
  comparison?: ProductComparisonItem[];
  shoppingList?: ShoppingListBundle;
  doctors: DoctorWithSlots[];
  coupons: CouponCode[];
  guides: Pick<GuideArticle, 'id' | 'slug' | 'category' | 'titleEn' | 'titleBn' | 'readTimeMin' | 'isMedicallyReviewed'>[];
  suggestedQuestions: string[];
}

const searchProductsDecl: FunctionDeclaration = {
  name: 'searchProducts',
  description:
    'Search the real Aloorai Bangladesh marketplace catalog by keyword, category, baby/mother stage, or BDT price range. Always use this before recommending or pricing any product.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Keywords (e.g. diaper, lotion, stroller, swaddle, gift, maternity)' },
      category: {
        type: Type.STRING,
        description:
          'Optional category slug: baby_clothing, diapers_wipes, feeding_products, baby_gear, baby_toys, books, baby_skincare, nursery, safety_products, maternity_wear, mother_care, educational_products',
      },
      ageGroup: {
        type: Type.STRING,
        description: 'Optional stage: newborn, infant, toddler, preschool, kids, pregnancy, new_mother',
      },
      maxPriceBdt: { type: Type.NUMBER, description: 'Maximum price in BDT (taka)' },
      minPriceBdt: { type: Type.NUMBER, description: 'Minimum price in BDT (taka)' },
      limit: { type: Type.NUMBER, description: 'Number of results (1-8)' },
    },
  },
};

const compareProductsDecl: FunctionDeclaration = {
  name: 'compareProducts',
  description:
    'Compare 2 to 4 real products from the catalog side by side by their product IDs (returned from searchProducts or activeProductId).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array of 2-4 real product IDs to compare.',
      },
    },
    required: ['productIds'],
  },
};

const generateShoppingListDecl: FunctionDeclaration = {
  name: 'generateShoppingList',
  description:
    'Generate a budget-aware shopping list bundle of real in-stock items (e.g. newborn starter kit, hospital bag, gift bundle, toddler play kit).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      goal: { type: Type.STRING, description: 'Title or purpose of the shopping list (e.g. Newborn Starter Kit, Hospital Bag)' },
      ageGroup: {
        type: Type.STRING,
        description: 'Optional stage: newborn, infant, toddler, preschool, kids, pregnancy, new_mother',
      },
      budgetBdt: { type: Type.NUMBER, description: 'Optional maximum total BDT budget' },
      categories: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Optional preferred category slugs',
      },
    },
    required: ['goal'],
  },
};

const searchDoctorsDecl: FunctionDeclaration = {
  name: 'searchDoctors',
  description:
    'Find real doctors in Doctor Corner with their verified/demo status, qualifications, hospital, BDT fee, and real open appointment slots for a given date.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      specialisation: {
        type: Type.STRING,
        description:
          'Optional: Paediatrician, Gynaecologist, Neonatologist, Nutritionist, Dermatologist, Child Development Specialist',
      },
      query: { type: Type.STRING, description: 'Optional doctor name or symptom keyword' },
      date: { type: Type.STRING, description: 'Optional YYYY-MM-DD date to check live open slots' },
    },
  },
};

const getGuidesAndCouponsDecl: FunctionDeclaration = {
  name: 'getGuidesAndCoupons',
  description:
    'Look up Aloorai parenting/pregnancy/baby-care guides and active promo coupons from the database.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING, description: 'Topic keyword e.g. pregnancy, feeding, sleep, vaccine, postpartum, newborn' },
    },
  },
};

const ALL_TOOLS = [
  {
    functionDeclarations: [
      searchProductsDecl,
      compareProductsDecl,
      generateShoppingListDecl,
      searchDoctorsDecl,
      getGuidesAndCouponsDecl,
    ],
  },
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new AiServiceError(
      'GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets to activate Aloorai AI Companion.',
      503,
      'API_KEY_MISSING'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildFollowUpSuggestions(
  detected: 'bn' | 'en' | 'banglish',
  hasProducts: boolean,
  hasDoctors: boolean,
  hasComparison: boolean
): string[] {
  if (detected === 'bn') {
    if (hasDoctors) {
      return ['আগামীকালের খালি স্লট দেখাও', 'নবজাতকের যত্নের গাইড দাও', 'বাজেট অনুযায়ী বেবি কিট বানাও'];
    }
    if (hasProducts || hasComparison) {
      return ['এই পণ্যগুলোর তুলনা করো', '২,০০০ টাকার নিচে গিফট দেখাও', 'ফ্রি ডেলিভারির জন্য শপিং লিস্ট বানাও'];
    }
    return ['নবজাতকের শপিং লিস্ট বানাও', '১,৫০০ টাকার মধ্যে গিফট সাজেস্ট করো', 'ভালো শিশু বিশেষজ্ঞ দেখাও'];
  }
  if (detected === 'banglish') {
    if (hasDoctors) {
      return ['Kal kon slot khali ache?', 'Newborn care er guide dao', '2000 takar moddhe baby kit dekhao'];
    }
    if (hasProducts || hasComparison) {
      return ['Ei product gulo compare koro', '1500 takar moddhe gift dao', 'Hospital bag shopping list banao'];
    }
    return ['Newborn starter list banao', '1500 takar moddhe gift dao', 'Paediatrician doctor dekhao'];
  }
  if (hasDoctors) {
    return ['Check tomorrow open slots', 'Build a newborn care checklist', 'Find baby skincare under ৳1,000'];
  }
  if (hasProducts || hasComparison) {
    return ['Compare top 2 options', 'Suggest a gift under ৳1,500', 'Make a shopping list for free delivery'];
  }
  return ['Create a newborn shopping list under ৳3,000', 'Recommend a baby shower gift', 'Find a verified paediatrician'];
}

export async function runAiCompanionChat(params: {
  viewerId: string;
  message: string;
  history?: unknown;
  context?: CompanionPageContext;
}): Promise<CompanionResponsePayload> {
  const cleanMessage = String(params.message || '').trim();
  if (!cleanMessage) {
    throw new AiServiceError('Please enter a message for Aloorai AI Companion.', 400, 'EMPTY_MESSAGE');
  }

  const ai = getGeminiClient();
  const db = getDb();
  const detectedLang = detectInputLanguage(cleanMessage);
  const history = sanitizeChatHistory(params.history);
  const ctx = params.context ?? {};

  const viewerBabies = db.babies.filter((b) => b.parentId === params.viewerId || params.viewerId === 'guest_demo');
  const activeProduct = ctx.activeProductId
    ? db.products.find((p) => p.id === ctx.activeProductId)
    : undefined;
  const activeDoctor = ctx.activeDoctorId
    ? db.doctors.find((d) => d.id === ctx.activeDoctorId)
    : undefined;

  const collectedProducts = new Map<string, ProductItem>();
  const collectedDoctors = new Map<string, DoctorWithSlots>();
  const collectedCoupons = new Map<string, CouponCode>();
  const collectedGuides = new Map<string, GuideArticle>();
  let comparisonResult: ProductComparisonItem[] | undefined;
  let shoppingListResult: ShoppingListBundle | undefined;

  if (activeProduct) {
    collectedProducts.set(activeProduct.id, activeProduct);
  }

  const systemInstruction = `You are "Aloorai AI Companion", the warm, practical, bilingual shopping, parenting, and care assistant inside Aloorai Bangladesh.

CORE CAPABILITIES YOU SUPPORT:
1. AI Shopping Assistant & Budget-based Shopping (BDT ৳)
2. AI Gift Recommendation (newborn, baby shower, 1st birthday, expecting/new mothers)
3. Product Comparison (using compareProducts)
4. Shopping List Generator (using generateShoppingList; note free nationwide delivery applies at ৳${db.settings.freeDeliveryThresholdBdt}+)
5. Baby Care Guidance, Pregnancy Assistance & Motherhood Guidance
6. Doctor Discovery & Appointment Booking Assistance (check real slots via searchDoctors)

STRICT GROUNDING & SAFETY RULES:
- ALWAYS call searchProducts / compareProducts / generateShoppingList before mentioning any product name, BDT price, discount, stock, or variant. NEVER invent products, stock, or prices.
- ALWAYS call searchDoctors before mentioning any doctor name, qualification, BMDC note, fee, or appointment slot. Clearly mention whether a doctor profile is Admin Verified or Demo/Pending Verification based on the tool result.
- For baby care, pregnancy, or medical symptoms: give gentle, supportive general guidance grounded in Aloorai guides (call getGuidesAndCoupons if helpful) and explicitly remind the user that this is not a medical diagnosis—they should consult a doctor via Doctor Corner, or visit an emergency room / call 999 for urgent symptoms.
- LANGUAGE MATCHING: Reply naturally in the user's style:
  * If user writes in Bengali script (বাংলা), reply in natural, warm Bengali with BDT (৳).
  * If user writes in Banglish (Bengali written in English letters like "amar bacchar jonno", "takar moddhe"), reply in friendly Banglish (or clear simple Bengali-English mix as requested).
  * If user writes in English, reply in clear, warm English.
- Keep responses concise, structured with short bullets, and actionable (2-5 short paragraphs or bullets max). Never repeat raw JSON or internal tool names.

LIVE SESSION CONTEXT:
- Current route: ${ctx.routePath || '/'}
- UI selected language: ${ctx.preferredLang || 'bn'}
- Items in cart: ${ctx.cartCount ?? 0}, Wishlist items: ${ctx.wishlistCount ?? 0}
- Family child profile(s): ${summarizeBabiesForPrompt(viewerBabies)}
- Currently viewing product: ${
    activeProduct
      ? `${activeProduct.id} — ${activeProduct.titleEn} / ${activeProduct.titleBn} (৳${activeProduct.priceBdt}, category: ${activeProduct.category}, stock: ${activeProduct.stock})`
      : 'None'
  }
- Currently viewing doctor: ${
    activeDoctor ? `${activeDoctor.id} — ${activeDoctor.nameEn} (${activeDoctor.specialisation})` : 'None'
  }
- Active marketplace categories: ${db.categories.map((c) => `${c.slug} (${c.nameEn})`).join(', ')}`;

  const contents: Content[] = [
    ...history.map((h) => ({
      role: h.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: h.text }],
    })),
    { role: 'user' as const, parts: [{ text: cleanMessage }] },
  ];

  const executeTool = (name: string, args: Record<string, unknown>) => {
    if (name === 'searchProducts') {
      const results = queryCatalogProducts(db.products, {
        query: typeof args.query === 'string' ? args.query : undefined,
        category: typeof args.category === 'string' ? args.category : undefined,
        ageGroup: typeof args.ageGroup === 'string' ? args.ageGroup : undefined,
        maxPriceBdt: typeof args.maxPriceBdt === 'number' ? args.maxPriceBdt : undefined,
        minPriceBdt: typeof args.minPriceBdt === 'number' ? args.minPriceBdt : undefined,
        limit: typeof args.limit === 'number' ? args.limit : 6,
      });
      for (const p of results) collectedProducts.set(p.id, p);
      return {
        count: results.length,
        products: results.map((p) => ({
          id: p.id,
          titleEn: p.titleEn,
          titleBn: p.titleBn,
          priceBdt: p.priceBdt,
          compareAtBdt: p.compareAtBdt,
          stock: p.stock,
          category: p.category,
          ageGroups: p.ageGroups,
          rating: p.rating,
          shopName: p.shopName,
          variants: p.variants,
          safetyInfoEn: p.safetyInfoEn,
        })),
      };
    }

    if (name === 'compareProducts') {
      const ids = Array.isArray(args.productIds)
        ? args.productIds.map((x) => String(x))
        : [];
      const cmp = buildProductComparison(db.products, ids);
      if (cmp.length > 0) {
        comparisonResult = cmp;
        for (const item of cmp) {
          const full = db.products.find((p) => p.id === item.id);
          if (full) collectedProducts.set(full.id, full);
        }
      }
      return { comparedCount: cmp.length, comparison: cmp };
    }

    if (name === 'generateShoppingList') {
      const bundle = buildBudgetShoppingList(db.products, {
        goal: typeof args.goal === 'string' ? args.goal : 'Mother & Baby Essentials',
        ageGroup: typeof args.ageGroup === 'string' ? args.ageGroup : undefined,
        budgetBdt: typeof args.budgetBdt === 'number' ? args.budgetBdt : undefined,
        categories: Array.isArray(args.categories)
          ? args.categories.map((c) => String(c))
          : undefined,
        freeDeliveryThresholdBdt: db.settings.freeDeliveryThresholdBdt,
      });
      shoppingListResult = bundle;
      for (const entry of bundle.items) {
        const full = db.products.find((p) => p.id === entry.productId);
        if (full) collectedProducts.set(full.id, full);
      }
      return bundle;
    }

    if (name === 'searchDoctors') {
      const matches = findMatchingDoctors(db.doctors, db.appointments, {
        specialisation: typeof args.specialisation === 'string' ? args.specialisation : undefined,
        query: typeof args.query === 'string' ? args.query : undefined,
        date: typeof args.date === 'string' ? args.date : undefined,
      });
      for (const m of matches) collectedDoctors.set(m.doctor.id, m);
      return {
        dateChecked: matches[0]?.date,
        doctors: matches.map((m) => ({
          id: m.doctor.id,
          nameEn: m.doctor.nameEn,
          nameBn: m.doctor.nameBn,
          specialisation: m.doctor.specialisation,
          qualifications: m.doctor.qualifications,
          bmdcRegNote: m.doctor.bmdcRegNote,
          experienceYears: m.doctor.experienceYears,
          hospitalEn: m.doctor.hospitalEn,
          consultationFeeBdt: m.doctor.consultationFeeBdt,
          isVerified: m.doctor.isVerified,
          openSlots: m.openSlots,
          date: m.date,
        })),
      };
    }

    if (name === 'getGuidesAndCoupons') {
      const topic = typeof args.topic === 'string' ? args.topic.toLowerCase() : '';
      const matchedGuides = db.guides
        .filter((g) =>
          topic
            ? `${g.titleEn} ${g.titleBn} ${g.category} ${g.summaryEn}`.toLowerCase().includes(topic)
            : true
        )
        .slice(0, 3);
      for (const g of matchedGuides) collectedGuides.set(g.id, g);
      const activeCoupons = db.coupons.filter((c) => c.isActive);
      for (const c of activeCoupons) collectedCoupons.set(c.code, c);
      return {
        guides: matchedGuides.map((g) => ({
          id: g.id,
          slug: g.slug,
          category: g.category,
          titleEn: g.titleEn,
          titleBn: g.titleBn,
          summaryEn: g.summaryEn,
          summaryBn: g.summaryBn,
          isMedicallyReviewed: g.isMedicallyReviewed,
        })),
        activeCoupons,
      };
    }

    return { error: `Unknown tool ${name}` };
  };

  try {
    let response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        tools: ALL_TOOLS,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    // Multi-step tool execution loop (up to 4 hops)
    for (let step = 0; step < 4; step++) {
      const calls = response.functionCalls;
      if (!calls || calls.length === 0) break;

      const modelContent = response.candidates?.[0]?.content;
      if (!modelContent) break;
      contents.push(modelContent);

      const responseParts = calls.map((call) => {
        const result = executeTool(call.name || '', (call.args as Record<string, unknown>) ?? {});
        return {
          functionResponse: {
            id: call.id,
            name: call.name || '',
            response: { result },
          },
        };
      });

      contents.push({
        role: 'user',
        parts: responseParts,
      });

      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          tools: ALL_TOOLS,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
    }

    const reply = (response.text || '').trim();
    if (!reply) {
      throw new AiServiceError(
        'Aloorai AI Companion did not return a text response. Please try rephrasing your question.',
        502,
        'EMPTY_AI_RESPONSE'
      );
    }

    const products = Array.from(collectedProducts.values()).slice(0, 4);
    const doctors = Array.from(collectedDoctors.values()).slice(0, 3);
    const coupons = Array.from(collectedCoupons.values()).slice(0, 2);
    const guides = Array.from(collectedGuides.values())
      .slice(0, 2)
      .map((g) => ({
        id: g.id,
        slug: g.slug,
        category: g.category,
        titleEn: g.titleEn,
        titleBn: g.titleBn,
        readTimeMin: g.readTimeMin,
        isMedicallyReviewed: g.isMedicallyReviewed,
      }));

    return {
      reply,
      detectedLanguage: detectedLang,
      products,
      comparison: comparisonResult,
      shoppingList: shoppingListResult,
      doctors,
      coupons,
      guides,
      suggestedQuestions: buildFollowUpSuggestions(
        detectedLang,
        products.length > 0,
        doctors.length > 0,
        Boolean(comparisonResult?.length)
      ),
    };
  } catch (err) {
    if (err instanceof AiServiceError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      throw new AiServiceError(
        'AI rate limit reached right now. Please wait a few seconds and retry.',
        429,
        'RESOURCE_EXHAUSTED'
      );
    }
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
      throw new AiServiceError(
        'Gemini API authentication failed. Please verify GEMINI_API_KEY in Settings > Secrets.',
        403,
        'API_KEY_INVALID'
      );
    }
    throw new AiServiceError(msg || 'Failed to contact Aloorai AI Companion.', 502, 'UPSTREAM_ERROR');
  }
}
