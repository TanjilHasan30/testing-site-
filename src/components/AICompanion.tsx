import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Calendar,
  Check,
  ExternalLink,
  Heart,
  ListChecks,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Stethoscope,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateProductDiscountPct, formatBdt } from '../lib/domain';
import type { ProductComparisonItem, ShoppingListBundle, DoctorWithSlots } from '../lib/aiCompanionHelpers';
import type { CouponCode, GuideArticle, ProductItem } from '../types/platform';

interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  products?: ProductItem[];
  comparison?: ProductComparisonItem[];
  shoppingList?: ShoppingListBundle;
  doctors?: DoctorWithSlots[];
  coupons?: CouponCode[];
  guides?: Pick<GuideArticle, 'id' | 'slug' | 'category' | 'titleEn' | 'titleBn' | 'readTimeMin' | 'isMedicallyReviewed'>[];
  suggestedQuestions?: string[];
  isError?: boolean;
  retryPrompt?: string;
}

const STORAGE_KEY = 'mc_ai_companion_history_v1';

const QUICK_ACTIONS = [
  {
    id: 'shopping',
    labelBn: 'শপিং সহায়তা',
    labelEn: 'Shopping Help',
    promptBn: 'আমার শিশুর জন্য সেরা ও জনপ্রিয় বেবি প্রোডাক্টগুলো দেখাও',
    promptEn: 'Recommend the best-selling baby essentials available right now',
  },
  {
    id: 'gift',
    labelBn: 'গিফট খুঁজুন',
    labelEn: 'Gift Finder',
    promptBn: 'নবজাতক বা বেবি শাওয়ারের জন্য ১,৫০০ থেকে ২,৫০০ টাকার মধ্যে ভালো গিফট সাজেস্ট করো',
    promptEn: 'Suggest thoughtful newborn baby shower gifts between ৳1,500 and ৳2,500',
  },
  {
    id: 'compare',
    labelBn: 'পণ্য তুলনা',
    labelEn: 'Compare Products',
    promptBn: 'ডায়াপার ও বেবি স্কিনকেয়ারের শীর্ষ ২টি পণ্য পাশাপাশি তুলনা করে দেখাও',
    promptEn: 'Compare two top baby skincare or diaper essentials side by side',
  },
  {
    id: 'budget',
    labelBn: '৳১,৫০০ বাজেট',
    labelEn: 'Under ৳1,500',
    promptBn: '১,৫০০ টাকার মধ্যে শিশুর দরকারি পণ্যগুলো কী কী আছে?',
    promptEn: 'Show me useful baby and mother care products under ৳1,500',
  },
  {
    id: 'list',
    labelBn: 'শপিং লিস্ট',
    labelEn: 'Shopping List',
    promptBn: '৩,০০০ টাকার বাজেটে একটি নবজাতক স্টার্টার শপিং লিস্ট বানিয়ে দাও',
    promptEn: 'Generate a newborn starter shopping list within a ৳3,000 budget',
  },
  {
    id: 'doctor',
    labelBn: 'ডাক্তার খুঁজুন',
    labelEn: 'Find Doctor',
    promptBn: 'যাচাইকৃত শিশু বিশেষজ্ঞ ও গাইনি ডাক্তারদের তালিকা এবং খালি স্লট দেখাও',
    promptEn: 'Show available paediatricians and gynaecologists with open booking slots',
  },
  {
    id: 'care',
    labelBn: 'গর্ভাবস্থা ও শিশুর যত্ন',
    labelEn: 'Baby & Pregnancy',
    promptBn: 'গর্ভাবস্থার পুষ্টি ও নবজাতকের ঘুমের নিয়ম সম্পর্কে সংক্ষিপ্ত গাইড দাও',
    promptEn: 'Share practical pregnancy nutrition and newborn sleep care guidance',
  },
];

function renderFormattedText(text: string): React.ReactNode {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        const segments = trimmed.split(/(\*\*[^*]+\*\*)/g).map((seg, idx) => {
          if (seg.startsWith('**') && seg.endsWith('**')) {
            return (
              <strong key={idx} className="font-semibold text-[#29243B]">
                {seg.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={idx}>{seg}</React.Fragment>;
        });
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          return (
            <p key={i} className="pl-3 relative">
              <span aria-hidden="true" className="absolute left-0 text-[#D93B52]">•</span>
              {segments}
            </p>
          );
        }
        return <p key={i}>{segments}</p>;
      })}
    </div>
  );
}

export const AICompanion: React.FC = () => {
  const { lang, cart, wishlistIds, viewerName, addToCart, toggleWishlist, apiFetch, showToast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<CompanionMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CompanionMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(-30);
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [checkedListIds, setCheckedListIds] = useState<Record<string, boolean>>({});
  const [bookedSlotKey, setBookedSlotKey] = useState<string | null>(null);
  const [bookingBusyKey, setBookingBusyKey] = useState<string | null>(null);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [isOpen, messages, sending]);

  useEffect(() => {
    const onOpenPrompt = (evt: Event) => {
      const custom = evt as CustomEvent<{ prompt?: string }>;
      setIsOpen(true);
      if (custom.detail?.prompt) {
        void sendPrompt(custom.detail.prompt);
      }
    };
    window.addEventListener('mc:open-ai-companion', onOpenPrompt);
    return () => window.removeEventListener('mc:open-ai-companion', onOpenPrompt);
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const activeProductId = location.pathname.startsWith('/products/')
    ? location.pathname.split('/')[2]
    : undefined;
  const activeDoctorId = location.pathname.startsWith('/doctors/')
    ? location.pathname.split('/')[2]
    : undefined;

  const sendPrompt = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || sending) return;

    const userMsg: CompanionMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    const historyForApi = messages
      .filter((m) => !m.isError)
      .slice(-12)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const data = await apiFetch<{
        reply: string;
        products?: ProductItem[];
        comparison?: ProductComparisonItem[];
        shoppingList?: ShoppingListBundle;
        doctors?: DoctorWithSlots[];
        coupons?: CouponCode[];
        guides?: CompanionMessage['guides'];
        suggestedQuestions?: string[];
      }>('/api/v1/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: historyForApi,
          context: {
            routePath: location.pathname + location.search,
            activeProductId,
            activeDoctorId,
            preferredLang: lang,
            cartCount: cart.reduce((s, c) => s + c.quantity, 0),
            wishlistCount: wishlistIds.length,
          },
        }),
      });

      const assistantMsg: CompanionMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        createdAt: new Date().toISOString(),
        products: data.products,
        comparison: data.comparison,
        shoppingList: data.shoppingList,
        doctors: data.doctors,
        coupons: data.coupons,
        guides: data.guides,
        suggestedQuestions: data.suggestedQuestions,
      };

      if (data.shoppingList?.items) {
        const initChecks: Record<string, boolean> = {};
        for (const item of data.shoppingList.items) {
          initChecks[`${assistantMsg.id}_${item.productId}`] = true;
        }
        setCheckedListIds((prev) => ({ ...prev, ...initChecks }));
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorText =
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'Aloorai AI-এর সাথে সংযোগ করতে সমস্যা হয়েছে।'
            : 'Unable to reach Aloorai AI Companion right now.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: errorText,
          createdAt: new Date().toISOString(),
          isError: true,
          retryPrompt: text,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(input);
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    showToast(lang === 'bn' ? 'চ্যাট ইতিহাস পরিষ্কার করা হয়েছে' : 'Conversation cleared');
  };

  const handleQuickBookSlot = async (doctorId: string, date: string, slot: string) => {
    const key = `${doctorId}_${date}_${slot}`;
    setBookingBusyKey(key);
    try {
      await apiFetch('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctorId,
          date,
          slot,
          consultationType: 'video',
          paymentMethod: 'bkash_sandbox',
          patientName: viewerName,
          notes: 'Booked via Aloorai AI Companion',
        }),
      });
      setBookedSlotKey(key);
      showToast(
        lang === 'bn'
          ? `${date} তারিখে ${slot} স্লটে সিরিয়াল নিশ্চিত হয়েছে!`
          : `Appointment confirmed for ${date} at ${slot}!`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to book slot');
    } finally {
      setBookingBusyKey(null);
    }
  };

  const handleAddShoppingListToCart = (msgId: string, list: ShoppingListBundle) => {
    const selected = list.items.filter((item) => checkedListIds[`${msgId}_${item.productId}`] !== false);
    if (selected.length === 0) {
      showToast(lang === 'bn' ? 'কমপক্ষে একটি পণ্য নির্বাচন করুন' : 'Select at least one item');
      return;
    }
    for (const item of selected) {
      addToCart({
        productId: item.productId,
        variant: item.variant || 'Standard',
        quantity: 1,
      });
    }
    showToast(
      lang === 'bn'
        ? `${selected.length}টি পণ্য শপিং ব্যাগে যোগ হয়েছে`
        : `${selected.length} shopping list items added to bag`
    );
  };

  const starterSuggestions =
    lang === 'bn'
      ? [
          '১,৫০০ টাকার মধ্যে নবজাতকের গিফট সাজেস্ট করো',
          'Amar 4 masher bacchar jonno lotion ar diaper suggest koro',
          'গর্ভাবস্থায় হসপিটাল ব্যাগের শপিং লিস্ট দাও',
          'ভালো শিশু বিশেষজ্ঞ ডাক্তার ও খালি স্লট দেখাও',
        ]
      : [
          'Suggest a newborn gift bundle under ৳2,000',
          'Amar 6 masher bacchar jonno 1500 takar moddhe diaper dao',
          'Compare top baby skincare products',
          'Find a paediatrician with open slots tomorrow',
        ];

  const contextLabel = activeProductId
    ? lang === 'bn'
      ? 'বর্তমান পণ্যের তথ্য যুক্ত'
      : 'Context: Viewing Product'
    : location.pathname.startsWith('/doctors')
      ? lang === 'bn'
        ? 'ডাক্তার কর্নার সহায়তা'
        : 'Context: Doctor Corner'
      : location.pathname.startsWith('/videos')
        ? lang === 'bn'
          ? 'ভিডিও ফিড সহায়তা'
          : 'Context: Short Videos'
        : location.pathname.startsWith('/baby-tracker')
          ? lang === 'bn'
            ? 'বেবি ট্র্যাকার তথ্য যুক্ত'
            : 'Context: Baby Tracker'
          : lang === 'bn'
            ? 'বাংলা · English · Banglish'
            : 'English · বাংলা · Banglish';

  return (
    <>
      {/* Global Floating Aloorai AI Companion Trigger Button (suppressed on mobile Reels view to preserve clean 5-icon column) */}
      {!isOpen && (
        <div
          className={`fixed bottom-[70px] right-3.5 lg:bottom-6 lg:right-6 z-40 ${
            location.pathname === '/' || location.pathname === '/videos' ? 'hidden lg:block' : ''
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              window.setTimeout(() => inputRef.current?.focus(), 120);
            }}
            aria-label="Ask Aloorai AI Companion"
            data-testid="mc-ai-fab"
            className="group relative inline-flex items-center justify-center lg:gap-2.5 rounded-full bg-[#29243B] hover:bg-[#3A3354] text-white shadow-[0_10px_28px_rgba(41,36,59,0.34)] border border-[#B8A5F5]/45 w-12 h-12 lg:w-auto lg:h-auto lg:p-1.5 lg:pr-4 transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            {/* Subtle ambient pulse ring (respects prefers-reduced-motion via index.css) */}
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full bg-[#B8A5F5]/25 animate-pulse pointer-events-none"
            />
            <span className="relative w-12 h-12 lg:w-10 lg:h-10 rounded-full bg-[#29243B] lg:bg-[#E83F58] lg:group-hover:bg-[#FF6478] text-white flex items-center justify-center shrink-0 transition-colors">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="relative hidden lg:inline-flex flex-col items-start text-left pr-0.5">
              <span className="text-xs font-semibold leading-tight whitespace-nowrap">
                Ask Aloorai AI
              </span>
              <span className="text-[10px] text-[#FFE3D9] leading-tight whitespace-nowrap">
                {lang === 'bn' ? 'এআই শপিং ও কেয়ার' : 'Shopping & Care'}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Mobile Full-Height Bottom Sheet / Desktop Floating Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Aloorai AI Companion"
          data-testid="mc-ai-drawer"
          className="fixed inset-0 lg:inset-auto lg:bottom-6 lg:right-6 z-50 flex items-end lg:block bg-[#29243B]/45 lg:bg-transparent backdrop-blur-[2px] lg:backdrop-blur-none"
        >
          <div className="w-full lg:w-[440px] h-[92dvh] lg:h-[650px] lg:max-h-[calc(100vh-3rem)] bg-[#FAF9F6] rounded-t-3xl lg:rounded-3xl border border-[#ECEAF0] shadow-[0_24px_64px_rgba(41,36,59,0.24)] flex flex-col overflow-hidden animate-sheet-in">
            {/* Mobile Drag Handle */}
            <div className="lg:hidden pt-2 pb-1 flex justify-center bg-white">
              <span aria-hidden="true" className="w-10 h-1 rounded-full bg-[#ECEAF0]" />
            </div>

            {/* Header */}
            <header className="px-4 py-3 bg-white border-b border-[#ECEAF0] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-2xl bg-[#E83F58] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[#29243B] truncate font-sans">
                    Aloorai AI Companion
                  </h2>
                  <p className="text-[11px] text-[#777486] truncate">{contextLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    aria-label="Clear chat history"
                    title={lang === 'bn' ? 'চ্যাট পরিষ্কার করুন' : 'Clear chat'}
                    className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-[#777486] hover:text-[#D93B52] hover:bg-[#FAF9F6] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Aloorai AI Companion"
                  className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-[#29243B] hover:bg-[#FAF9F6] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Quick-Action Bar */}
            <div className="px-3 py-2 bg-white border-b border-[#ECEAF0] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.id}
                  type="button"
                  disabled={sending}
                  onClick={() => void sendPrompt(lang === 'bn' ? qa.promptBn : qa.promptEn)}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F3F0FE] border border-[#ECEAF0] hover:border-[#B8A5F5] text-[11px] font-semibold text-[#29243B] whitespace-nowrap shrink-0 transition-colors"
                >
                  {lang === 'bn' ? qa.labelBn : qa.labelEn}
                </button>
              ))}
            </div>

            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-4 border border-[#ECEAF0] space-y-2">
                    <p className="text-sm font-semibold text-[#29243B]">
                      {lang === 'bn'
                        ? 'আসসালামু আলাইকুম! আমি Aloorai AI Companion'
                        : 'Hello! I am Aloorai AI Companion'}
                    </p>
                    <p className="text-xs text-[#777486] leading-relaxed">
                      {lang === 'bn'
                        ? 'বাংলা, English অথবা Banglish-এ প্রশ্ন করুন — সঠিক দামের পণ্য খোঁজা, গিফট সাজেস্ট, তুলনা, বাজেট শপিং লিস্ট, শিশু ও গর্ভাবস্থার যত্ন এবং ডাক্তার অ্যাপয়েন্টমেন্টে সাহায্য করতে পারি।'
                        : 'Ask me in English, বাংলা, or Banglish for real catalog recommendations, gift ideas, side-by-side product comparisons, budget shopping lists, baby/pregnancy care guidance, or verified doctor slot discovery.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-[#777486] uppercase tracking-wider px-1">
                      {lang === 'bn' ? 'শুরু করার জন্য জিজ্ঞাসা করুন' : 'Try asking'}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {starterSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void sendPrompt(s)}
                          className="text-left px-3.5 py-2.5 rounded-2xl bg-white hover:bg-[#F3F0FE]/60 border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-medium text-[#29243B] transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Bubble */}
                  <div
                    className={`max-w-[88%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-[#29243B] text-white rounded-br-sm text-[13px] leading-relaxed'
                        : msg.isError
                          ? 'bg-[#FFE3D9]/70 border border-[#FF6478]/40 text-[#29243B] rounded-bl-sm'
                          : 'bg-white border border-[#ECEAF0] text-[#29243B] rounded-bl-sm shadow-[0_1px_6px_rgba(41,36,59,0.03)]'
                    }`}
                  >
                    {msg.role === 'user' ? <p>{msg.text}</p> : renderFormattedText(msg.text)}
                    {msg.isError && msg.retryPrompt && (
                      <button
                        type="button"
                        onClick={() => void sendPrompt(msg.retryPrompt!)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#29243B] text-white text-xs font-semibold hover:bg-[#E83F58] transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {lang === 'bn' ? 'আবার চেষ্টা করুন' : 'Retry'}
                      </button>
                    )}
                  </div>

                  {/* Interactive Product Recommendation Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="w-full space-y-2">
                      <p className="text-[11px] font-semibold text-[#777486] px-1">
                        {lang === 'bn' ? 'ক্যাটালগ থেকে প্রস্তাবিত পণ্য' : 'Recommended from Aloorai'}
                      </p>
                      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                        {msg.products.map((prod) => {
                          const disc = calculateProductDiscountPct(prod.priceBdt, prod.compareAtBdt);
                          const wished = wishlistIds.includes(prod.id);
                          return (
                            <article
                              key={prod.id}
                              className="w-48 shrink-0 bg-white rounded-2xl border border-[#ECEAF0] overflow-hidden flex flex-col justify-between"
                            >
                              <Link
                                to={`/products/${prod.id}`}
                                onClick={() => setIsOpen(false)}
                                className="block relative aspect-[4/3] bg-[#FAF9F6] overflow-hidden"
                              >
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.titleEn}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                                {disc > 0 && (
                                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#E83F58] text-white text-[10px] font-semibold tabular-nums">
                                    -{disc}%
                                  </span>
                                )}
                              </Link>
                              <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                                <div>
                                  <Link
                                    to={`/products/${prod.id}`}
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs font-semibold text-[#29243B] line-clamp-2 hover:text-[#D93B52]"
                                  >
                                    {lang === 'bn' ? prod.titleBn : prod.titleEn}
                                  </Link>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs font-bold text-[#29243B] tabular-nums">
                                      {formatBdt(prod.priceBdt, lang)}
                                    </span>
                                    <span className="text-[10px] text-[#777486] inline-flex items-center gap-0.5 tabular-nums">
                                      <Star className="w-3 h-3 fill-[#FF6478] text-[#FF6478]" />
                                      {prod.rating.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addToCart({
                                        productId: prod.id,
                                        variant: prod.variants[0] || 'Standard',
                                        quantity: 1,
                                      })
                                    }
                                    className="flex-1 py-1.5 px-2 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-[11px] font-semibold inline-flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <ShoppingBag className="w-3 h-3" />
                                    {lang === 'bn' ? 'ব্যাগে যোগ' : 'Add'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleWishlist(prod.id)}
                                    aria-label={`Save ${prod.titleEn} to wishlist`}
                                    className="w-8 h-8 rounded-xl border border-[#ECEAF0] flex items-center justify-center hover:bg-[#FFE3D9]/50 shrink-0"
                                  >
                                    <Heart
                                      className={`w-3.5 h-3.5 ${
                                        wished ? 'fill-[#FF6478] text-[#FF6478]' : 'text-[#777486]'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Product Comparison Card */}
                  {msg.comparison && msg.comparison.length >= 2 && (
                    <div className="w-full bg-white rounded-2xl border border-[#ECEAF0] p-3 space-y-2.5 overflow-x-auto">
                      <p className="text-xs font-semibold text-[#29243B]">
                        {lang === 'bn' ? 'পাশাপাশি পণ্যের তুলনা' : 'Side-by-Side Comparison'}
                      </p>
                      <div className="grid grid-cols-2 gap-2.5 min-w-[280px]">
                        {msg.comparison.slice(0, 2).map((item) => (
                          <div key={item.id} className="rounded-xl bg-[#FAF9F6] p-2.5 border border-[#ECEAF0] space-y-1.5">
                            <img
                              src={item.imageUrl}
                              alt={item.titleEn}
                              referrerPolicy="no-referrer"
                              className="w-full h-20 object-cover rounded-lg"
                            />
                            <p className="text-xs font-semibold text-[#29243B] line-clamp-2">
                              {lang === 'bn' ? item.titleBn : item.titleEn}
                            </p>
                            <p className="text-xs font-bold text-[#D93B52] tabular-nums">
                              {formatBdt(item.priceBdt, lang)}
                            </p>
                            <div className="text-[11px] text-[#777486] space-y-0.5 tabular-nums">
                              <p>Rating: {item.rating.toFixed(1)} ({item.reviewsCount})</p>
                              <p>Stock: {item.stock} available</p>
                              <p className="truncate">Shop: {item.shopName}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                addToCart({
                                  productId: item.id,
                                  variant: item.variants[0] || 'Standard',
                                  quantity: 1,
                                })
                              }
                              className="w-full py-1.5 rounded-lg bg-[#29243B] text-white text-[11px] font-semibold hover:bg-[#E83F58]"
                            >
                              {lang === 'bn' ? 'ব্যাগে যোগ করুন' : 'Add to Bag'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shopping List Bundle Card */}
                  {msg.shoppingList && msg.shoppingList.items.length > 0 && (
                    <div className="w-full bg-white rounded-2xl border border-[#ECEAF0] p-3.5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-[#29243B] flex items-center gap-1.5">
                            <ListChecks className="w-4 h-4 text-[#D93B52]" />
                            {lang === 'bn' ? msg.shoppingList.titleBn : msg.shoppingList.titleEn}
                          </p>
                          <p className="text-[11px] text-[#777486] mt-0.5 tabular-nums">
                            {lang === 'bn' ? 'মোট:' : 'Total:'} {formatBdt(msg.shoppingList.totalBdt, lang)}
                            {msg.shoppingList.qualifiesForFreeDelivery
                              ? lang === 'bn'
                                ? ' · ফ্রি ডেলিভারি প্রযোজ্য'
                                : ' · Free delivery unlocked'
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="divide-y divide-[#ECEAF0]">
                        {msg.shoppingList.items.map((item) => {
                          const key = `${msg.id}_${item.productId}`;
                          const checked = checkedListIds[key] !== false;
                          return (
                            <label key={item.productId} className="py-2 flex items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setCheckedListIds((prev) => ({ ...prev, [key]: !checked }))
                                }
                                className="accent-[#E83F58] w-4 h-4 rounded shrink-0"
                              />
                              <img
                                src={item.imageUrl}
                                alt={item.titleEn}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#FAF9F6]"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-[#29243B] truncate">
                                  {lang === 'bn' ? item.titleBn : item.titleEn}
                                </p>
                                <p className="text-[11px] text-[#777486] truncate">
                                  {lang === 'bn' ? item.reasonBn : item.reasonEn}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-[#29243B] tabular-nums shrink-0">
                                {formatBdt(item.priceBdt, lang)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddShoppingListToCart(msg.id, msg.shoppingList!)}
                        className="w-full py-2 rounded-xl bg-[#E83F58] hover:bg-[#D6324B] text-white text-xs font-semibold transition-colors"
                      >
                        {lang === 'bn' ? 'নির্বাচিত সব পণ্য ব্যাগে যোগ করুন' : 'Add Selected List to Bag'}
                      </button>
                    </div>
                  )}

                  {/* Doctor Discovery & Slot Booking Cards */}
                  {msg.doctors && msg.doctors.length > 0 && (
                    <div className="w-full space-y-2">
                      {msg.doctors.map(({ doctor, openSlots, date }) => (
                        <div
                          key={doctor.id}
                          className="bg-[#EFF8F3] border border-[#B8DCCB] rounded-2xl p-3 space-y-2.5"
                        >
                          <div className="flex items-start gap-2.5">
                            <img
                              src={doctor.avatarUrl}
                              alt={doctor.nameEn}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[#B8DCCB]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-[#1E5A40]">
                                {doctor.isVerified ? (
                                  <>
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>{lang === 'bn' ? 'যাচাইকৃত ডাক্তার' : 'Verified Doctor'}</span>
                                  </>
                                ) : (
                                  <span>{lang === 'bn' ? 'ডেমো প্রোফাইল' : 'Demo Profile'}</span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-[#29243B] truncate">
                                {lang === 'bn' ? doctor.nameBn : doctor.nameEn}
                              </p>
                              <p className="text-[11px] text-[#29243B]/75 truncate">
                                {doctor.specialisation} · {formatBdt(doctor.consultationFeeBdt, lang)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/doctors/${doctor.id}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-[#B8DCCB] text-[11px] font-semibold text-[#29243B] hover:border-[#29243B] shrink-0"
                            >
                              {lang === 'bn' ? 'প্রোফাইল' : 'Profile'}
                            </button>
                          </div>

                          {openSlots.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-medium text-[#1E5A40] flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {lang === 'bn'
                                  ? `${date} তারিখে সরাসরি বুক করুন:`
                                  : `Quick-book open slots (${date}):`}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {openSlots.slice(0, 3).map((slot) => {
                                  const key = `${doctor.id}_${date}_${slot}`;
                                  const isBooked = bookedSlotKey === key;
                                  const isBusy = bookingBusyKey === key;
                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      disabled={isBusy || isBooked}
                                      onClick={() => void handleQuickBookSlot(doctor.id, date, slot)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold tabular-nums inline-flex items-center gap-1 transition-colors ${
                                        isBooked
                                          ? 'bg-[#1E5A40] text-white'
                                          : 'bg-white border border-[#B8DCCB] text-[#29243B] hover:bg-[#29243B] hover:text-white'
                                      }`}
                                    >
                                      {isBooked ? <Check className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                                      {isBusy ? '...' : slot}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Guides & Coupons */}
                  {((msg.guides && msg.guides.length > 0) || (msg.coupons && msg.coupons.length > 0)) && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.guides?.map((g) => (
                        <Link
                          key={g.id}
                          to="/guide"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-[#ECEAF0] text-[11px] font-medium text-[#29243B] hover:border-[#B8A5F5]"
                        >
                          <ExternalLink className="w-3 h-3 text-[#D93B52]" />
                          <span className="truncate max-w-[200px]">
                            {lang === 'bn' ? g.titleBn : g.titleEn}
                          </span>
                        </Link>
                      ))}
                      {msg.coupons?.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(c.code).catch(() => {});
                            showToast(lang === 'bn' ? `কুপন ${c.code} কপি হয়েছে` : `Coupon ${c.code} copied`);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-[#FFE3D9] text-[11px] font-semibold text-[#29243B]"
                        >
                          {c.code} · {lang === 'bn' ? c.descriptionBn : c.descriptionEn}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Suggested Follow-up Questions */}
                  {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedQuestions.map((sq) => (
                        <button
                          key={sq}
                          type="button"
                          disabled={sending}
                          onClick={() => void sendPrompt(sq)}
                          className="px-3 py-1.5 rounded-xl bg-[#F3F0FE] hover:bg-[#B8A5F5]/35 text-[11px] font-medium text-[#29243B] transition-colors"
                        >
                          {sq}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {sending && (
                <div className="flex items-start">
                  <div className="bg-white border border-[#ECEAF0] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-xs text-[#777486]">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E83F58] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B8A5F5] animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1E5A40] animate-bounce [animation-delay:240ms]" />
                    </span>
                    <span>
                      {lang === 'bn'
                        ? 'Aloorai AI ক্যাটালগ ও তথ্য খুঁজছে...'
                        : 'Aloorai AI is checking catalog & guidance...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* Bottom Input Composer */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-white border-t border-[#ECEAF0] flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                aria-label="Ask Aloorai AI Companion"
                placeholder={
                  lang === 'bn'
                    ? 'বাংলা, English বা Banglish-এ লিখুন...'
                    : 'Ask in English, বাংলা, or Banglish...'
                }
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] placeholder:text-[#777486] focus:outline-none focus:border-[#B8A5F5]"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message to Aloorai AI"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#E83F58] hover:bg-[#D6324B] disabled:opacity-45 text-white flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
