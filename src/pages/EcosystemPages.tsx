import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Baby,
  Bookmark,
  Calendar,
  CheckCircle2,
  Heart,
  HelpCircle,
  LifeBuoy,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
  User,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { calculateBabyAgeMonths, formatBdt, formatCount, resolveVideoMedia } from '../lib/domain';
import type {
  AppointmentItem,
  BabyProfile,
  BrandProfile,
  OrderItem,
  PostItem,
  ProductItem,
  SupportTicket,
} from '../types/platform';

export const AccountHubPage: React.FC = () => {
  const {
    lang,
    viewerId,
    viewerName,
    firebaseUser,
    signInWithGoogle,
    signOutUser,
    wishlistIds,
    cart,
    apiFetch,
  } = useApp();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [savedPosts, setSavedPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<OrderItem[]>('/api/v1/orders').catch(() => []),
      apiFetch<BabyProfile[]>('/api/v1/babies').catch(() => []),
      apiFetch<AppointmentItem[]>('/api/v1/appointments').catch(() => []),
      apiFetch<SupportTicket[]>('/api/v1/support-tickets').catch(() => []),
      apiFetch<{ items: PostItem[] }>('/api/v1/feed?tab=discover&limit=20').catch(() => ({ items: [] })),
    ])
      .then(([ord, bab, app, tkt, feed]) => {
        setOrders(ord);
        setBabies(bab);
        setAppointments(app);
        setTickets(tkt);
        setSavedPosts(feed.items.slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, [apiFetch]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Member Header */}
      <section className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECEAF0] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FFE3D9] flex items-center justify-center text-[#29243B] font-bold text-xl shrink-0">
            {viewerName.slice(0, 1)}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#D93B52]">
              {lang === 'bn' ? 'সদস্য অ্যাকাউন্ট হাব' : 'Member Account Hub'}
            </p>
            <h1 className="text-2xl font-display font-semibold text-[#29243B]">{viewerName}</h1>
            <p className="text-xs text-[#777486]">
              {firebaseUser ? firebaseUser.email : `Demo Session · ${viewerId}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/profile"
            className="px-4 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-semibold text-[#29243B]"
          >
            {lang === 'bn' ? 'পাবলিক প্রোফাইল' : 'Public Profile'}
          </Link>
          <Link
            to="/settings"
            className="px-4 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-semibold text-[#29243B]"
          >
            {lang === 'bn' ? 'সেটিংস' : 'Settings'}
          </Link>
          {firebaseUser ? (
            <button
              type="button"
              onClick={signOutUser}
              className="px-4 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
            >
              {t(lang, 'logout')}
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="px-4 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
            >
              {t(lang, 'login')} (Google)
            </button>
          )}
        </div>
      </section>

      {/* Quick Summary Tiles */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { to: '/orders', icon: Package, label: t(lang, 'orders'), count: orders.length, tint: 'bg-[#FFE3D9] text-[#D93B52]' },
          { to: '/baby-tracker', icon: Baby, label: lang === 'bn' ? 'আমার সন্তান' : 'My Children', count: babies.length, tint: 'bg-[#EFF8F3] text-[#1E5A40]' },
          { to: '/wishlist', icon: Heart, label: t(lang, 'wishlist'), count: wishlistIds.length, tint: 'bg-[#F3F0FE] text-[#29243B]' },
          { to: '/appointments', icon: Calendar, label: lang === 'bn' ? 'ডাক্তার অ্যাপয়েন্টমেন্ট' : 'Appointments', count: appointments.length, tint: 'bg-[#EFF8F3] text-[#1E5A40]' },
          { to: '/cart', icon: ShoppingBag, label: t(lang, 'cart'), count: cart.reduce((s, c) => s + c.quantity, 0), tint: 'bg-[#FFE3D9] text-[#D93B52]' },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.to}
              to={tile.to}
              className="bg-white rounded-2xl p-4 border border-[#ECEAF0] hover:border-[#B8A5F5] transition-colors flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-xs text-[#777486]">{tile.label}</p>
                <p className="text-xl font-bold text-[#29243B] tabular-nums mt-0.5">{tile.count}</p>
              </div>
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tile.tint}`}>
                <Icon className="w-5 h-5" />
              </span>
            </Link>
          );
        })}
      </section>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-56 rounded-3xl bg-white border border-[#ECEAF0] animate-pulse" />
          <div className="h-56 rounded-3xl bg-white border border-[#ECEAF0] animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* My Children & Personalisation */}
          <section className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <Baby className="w-4 h-4 text-[#1E5A40]" />
                {lang === 'bn' ? 'আমার সন্তান ও বয়সভিত্তিক ম্যাচিং' : 'My Children & Age Matching'}
              </h2>
              <Link to="/baby-tracker" className="text-xs font-semibold text-[#D93B52] hover:underline">
                {lang === 'bn' ? 'ট্র্যাকার খুলুন' : 'Open Tracker'}
              </Link>
            </div>
            {babies.length === 0 ? (
              <p className="text-sm text-[#777486]">
                {lang === 'bn' ? 'এখনো কোনো শিশুর প্রোফাইল যোগ করা হয়নি।' : 'No child profile added yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {babies.map((baby) => {
                  const ageMonths = calculateBabyAgeMonths(baby.dob);
                  const completedVaccines = baby.vaccinations.filter((v) => v.status === 'completed').length;
                  return (
                    <div key={baby.id} className="p-4 rounded-2xl bg-[#EFF8F3] border border-[#B8DCCB] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#29243B]">{baby.name}</p>
                        <span className="text-xs font-semibold text-[#1E5A40] tabular-nums">
                          {ageMonths} {lang === 'bn' ? 'মাস' : 'months'}
                        </span>
                      </div>
                      <p className="text-xs text-[#1E5A40]">
                        {lang === 'bn'
                          ? `সম্পন্ন টিকা: ${completedVaccines}/${baby.vaccinations.length} · লগ: ${baby.logs.length}`
                          : `EPI Vaccines: ${completedVaccines}/${baby.vaccinations.length} · Growth logs: ${baby.logs.length}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Orders */}
          <section className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#D93B52]" />
                {lang === 'bn' ? 'সাম্প্রতিক অর্ডার' : 'Recent Orders'}
              </h2>
              <Link to="/orders" className="text-xs font-semibold text-[#D93B52] hover:underline">
                {lang === 'bn' ? 'সব অর্ডার' : 'All Orders'}
              </Link>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-[#777486]">
                {lang === 'bn' ? 'এখনো কোনো অর্ডার নেই।' : 'You have not placed an order yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 3).map((ord) => (
                  <div key={ord.id} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold font-mono-num text-[#29243B]">{ord.id}</p>
                      <p className="text-xs text-[#777486] mt-0.5">
                        {ord.district} · {ord.subOrders.length} {lang === 'bn' ? 'সেলার' : 'shop(s)'} · {ord.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#29243B] tabular-nums">{formatBdt(ord.totalBdt, lang)}</p>
                      <Link to="/orders" className="text-xs font-semibold text-[#D93B52] hover:underline">
                        {lang === 'bn' ? 'ট্র্যাক করুন' : 'Track'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Doctor Appointments & Support Tickets */}
          <section className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1E5A40]" />
                {lang === 'bn' ? 'ডাক্তার কনসালটেশন' : 'Doctor Consultations'}
              </h2>
              <Link to="/doctors" className="text-xs font-semibold text-[#D93B52] hover:underline">
                {lang === 'bn' ? 'নতুন বুকিং' : 'Book Doctor'}
              </Link>
            </div>
            {appointments.length === 0 ? (
              <p className="text-sm text-[#777486]">No appointments booked yet.</p>
            ) : (
              <div className="space-y-2.5">
                {appointments.slice(0, 3).map((app) => (
                  <div key={app.id} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#29243B]">{app.doctorName}</p>
                      <p className="text-[11px] text-[#777486] tabular-nums">
                        {app.date} · {app.slot} · {app.consultationType}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1E5A40] capitalize">{app.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Support Tickets & Saved Stories */}
          <section className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-[#D93B52]" />
                {lang === 'bn' ? 'সাপোর্ট ও রিটার্ন টিকেট' : 'Support & Return Tickets'}
              </h2>
              <Link to="/support" className="text-xs font-semibold text-[#D93B52] hover:underline">
                {lang === 'bn' ? 'নতুন টিকেট' : 'Open Ticket'}
              </Link>
            </div>
            {tickets.length === 0 ? (
              <p className="text-sm text-[#777486]">No open support tickets.</p>
            ) : (
              <div className="space-y-2.5">
                {tickets.slice(0, 3).map((tkt) => (
                  <div key={tkt.id} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#29243B] truncate">{tkt.subject}</p>
                      <p className="text-[11px] text-[#777486] font-mono-num">
                        {tkt.id} · {tkt.type}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#29243B] capitalize shrink-0">{tkt.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Saved Social Inspirations + Partner Entry */}
          <section className="lg:col-span-12 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#D93B52]" />
                {lang === 'bn' ? 'সেভ করা কমিউনিটি নোট ও সেলার পোর্টাল' : 'Saved Community Notes & Partner Portals'}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Link to="/saved" className="text-xs font-semibold text-[#D93B52] hover:underline">
                  {lang === 'bn' ? 'সব সেভড দেখুন' : 'All Saved'}
                </Link>
                <span aria-hidden="true" className="text-[#ECEAF0]">|</span>
                <Link to="/seller/register" className="text-xs font-semibold text-[#1E5A40] hover:underline">
                  {lang === 'bn' ? 'সেলার হিসেবে যোগ দিন' : 'Become a Seller'}
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {savedPosts.map((post) => {
                const thumb = post.isVideo ? resolveVideoMedia(post.mediaUrls).posterSrc : post.mediaUrls[0];
                return (
                  <Link
                    key={post.id}
                    to={post.isVideo ? `/videos?v=${post.id}` : '/discover'}
                    className="rounded-2xl overflow-hidden border border-[#ECEAF0] hover:border-[#B8A5F5] bg-[#FAF9F6] transition-colors"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={thumb}
                        alt={post.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-[#29243B] line-clamp-1">
                        {lang === 'bn' ? post.titleBn : post.titleEn}
                      </p>
                      <p className="text-[11px] text-[#777486] mt-0.5">{post.authorName}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export const SellerRegisterPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [businessType, setBusinessType] = useState('Baby Clothing & Newborn Essentials');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSeller, setSubmittedSeller] = useState<{ id: string; shopName: string; district: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await apiFetch<{ id: string; shopName: string; district: string }>('/api/v1/sellers/register', {
        method: 'POST',
        body: JSON.stringify({ shopName, district, businessType, phone }),
      });
      setSubmittedSeller(created);
      showToast(lang === 'bn' ? 'সেলার আবেদন জমা হয়েছে!' : 'Seller onboarding application submitted!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <section className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECEAF0] space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#FFE3D9] flex items-center justify-center">
            <Store className="w-5 h-5 text-[#D93B52]" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-semibold text-[#29243B]">
              {lang === 'bn' ? 'Aloorai-এ সেলার হিসেবে যোগ দিন' : 'Sell on Aloorai Bangladesh'}
            </h1>
            <p className="text-sm text-[#777486]">
              {lang === 'bn'
                ? 'সারাদেশের মা ও পরিবারের কাছে আপনার পণ্য পৌঁছে দিন। অ্যাডমিন রিভিউয়ের পর শপ সক্রিয় হবে।'
                : 'Reach parents across 64 districts. Submitted shops appear in the Admin approval queue before going live.'}
            </p>
          </div>
        </div>
      </section>

      {submittedSeller ? (
        <div className="bg-[#EFF8F3] border border-[#B8DCCB] rounded-3xl p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-[#1E5A40]">
            <CheckCircle2 className="w-6 h-6" />
            <h2 className="text-lg font-display font-semibold">
              {lang === 'bn' ? 'আবেদন সফলভাবে জমা হয়েছে' : 'Application Received — Pending Admin Review'}
            </h2>
          </div>
          <p className="text-sm text-[#29243B]">
            <strong>{submittedSeller.shopName}</strong> ({submittedSeller.district}) · ID:{' '}
            <span className="font-mono-num">{submittedSeller.id}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-5 py-2.5 rounded-2xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
            >
              {lang === 'bn' ? 'অ্যাডমিন অনুমোদন কিউ দেখুন' : 'Review in Admin Console'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/seller/dashboard')}
              className="px-5 py-2.5 rounded-2xl bg-white border border-[#ECEAF0] text-xs font-semibold text-[#29243B]"
            >
              {lang === 'bn' ? 'সেলার ড্যাশবোর্ড' : 'Go to Seller Hub'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECEAF0] space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-[#29243B]">
                {lang === 'bn' ? 'দোকান / ব্র্যান্ডের নাম *' : 'Shop or Brand Name *'}
              </span>
              <input
                required
                minLength={3}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g., Dhaka Organic Baby Care"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-[#29243B]">
                {lang === 'bn' ? 'জেলা *' : 'Primary District *'}
              </span>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
              >
                {['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-[#29243B]">
                {lang === 'bn' ? 'পণ্যের ধরন' : 'Primary Product Category'}
              </span>
              <input
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-[#29243B]">
                {lang === 'bn' ? 'যোগাযোগের নম্বর (ঐচ্ছিক)' : 'Business Contact Phone'}
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
              />
            </label>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs text-[#777486] space-y-1">
            <p className="font-semibold text-[#29243B]">
              {lang === 'bn' ? 'সেলার নীতিমালা ও কমিশন স্বচ্ছতা' : 'Transparent Seller Policy'}
            </p>
            <p>
              {lang === 'bn'
                ? 'সকল শিশু ও মাতৃপণ্য নিরাপদ ও আসল হতে হবে। অর্ডার ডেলিভারির পর সেলার পেআউট হিসাব করা হয়।'
                : 'All baby & maternity products must be safe, accurate, and genuine. Multi-vendor sub-orders track per-shop payout & commission cleanly.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-2xl bg-[#E83F58] hover:bg-[#D93B52] text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {submitting
              ? lang === 'bn'
                ? 'জমা হচ্ছে...'
                : 'Submitting...'
              : lang === 'bn'
                ? 'সেলার আবেদন জমা দিন'
                : 'Submit Seller Application'}
          </button>
        </form>
      )}
    </div>
  );
};

export const BrandsDirectoryPage: React.FC = () => {
  const { slug } = useParams();
  const { lang, apiFetch } = useApp();
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<BrandProfile[]>('/api/v1/brands'),
      apiFetch<{ products: ProductItem[] }>('/api/v1/products'),
    ])
      .then(([b, p]) => {
        setBrands(b);
        setProducts(p.products);
      })
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const activeBrand = slug ? brands.find((b) => b.slug === slug) : null;
  const brandProducts = activeBrand
    ? products.filter((p) => p.brandId === activeBrand.id || p.shopSlug === activeBrand.slug)
    : [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {activeBrand ? (
        <>
          <div className="bg-white rounded-3xl overflow-hidden border border-[#ECEAF0]">
            <div className="h-44 sm:h-56 overflow-hidden relative">
              <img
                src={activeBrand.bannerUrl}
                alt={activeBrand.nameEn}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#29243B]/75 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 text-white flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={activeBrand.logoUrl}
                    alt={activeBrand.nameEn}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white"
                  />
                  <div>
                    <h1 className="text-2xl font-display font-semibold">
                      {lang === 'bn' ? activeBrand.nameBn : activeBrand.nameEn}
                    </h1>
                    <p className="text-xs text-white/85">
                      {lang === 'bn' ? activeBrand.taglineBn : activeBrand.taglineEn}
                    </p>
                  </div>
                </div>
                <Link
                  to="/brands"
                  className="px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-xs font-semibold hover:bg-white/25"
                >
                  {lang === 'bn' ? 'সব ব্র্যান্ড দেখুন' : 'All Brands'}
                </Link>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-display font-semibold text-[#29243B]">
              {lang === 'bn' ? 'ব্র্যান্ডের পণ্যসমূহ' : `Products from ${activeBrand.nameEn}`}
            </h2>
            {brandProducts.length === 0 ? (
              <p className="text-sm text-[#777486]">No products listed for this brand yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {brandProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECEAF0] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#D93B52]">
                {lang === 'bn' ? 'পার্টনার ব্র্যান্ড ও স্যাম্পল শপ' : 'Brands We Love · Sample Partners'}
              </p>
              <h1 className="text-2xl md:text-3xl font-display font-semibold text-[#29243B]">
                {lang === 'bn' ? 'মা ও শিশুর জনপ্রিয় পার্টনার ব্র্যান্ড' : 'Curated Mother & Baby Brand Partners'}
              </h1>
              <p className="text-sm text-[#777486]">
                {lang === 'bn'
                  ? 'বাংলাদেশের পরিবারবান্ধব ব্র্যান্ড ও ডেমো পার্টনার স্টোর ব্রাউজ করুন।'
                  : 'Explore curated Bangladesh partner collections across apparel, nursery, organic care, and feeding.'}
              </p>
            </div>
            <Link
              to="/seller/register"
              className="px-5 py-2.5 rounded-2xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              {lang === 'bn' ? 'ব্র্যান্ড পার্টনার হন' : 'Partner With Us'}
            </Link>
          </section>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-60 rounded-3xl bg-white border border-[#ECEAF0] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  to={`/brands/${brand.slug}`}
                  className="bg-white rounded-3xl overflow-hidden border border-[#ECEAF0] hover:border-[#B8A5F5] transition-colors flex flex-col"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-[#FAF9F6]">
                    <img
                      src={brand.bannerUrl}
                      alt={brand.nameEn}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h2 className="text-base font-display font-semibold text-[#29243B]">
                        {lang === 'bn' ? brand.nameBn : brand.nameEn}
                      </h2>
                      <p className="text-xs text-[#777486] line-clamp-2">
                        {lang === 'bn' ? brand.taglineBn : brand.taglineEn}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-xs text-[#777486]">
                      <span className="inline-flex items-center gap-1 text-[#29243B] font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {brand.rating}
                      </span>
                      <span className="tabular-nums">{formatCount(brand.followersCount, lang)} followers</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const SupportAndPolicyPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const location = useLocation();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [type, setType] = useState<SupportTicket['type']>(
    location.pathname.includes('return') ? 'return' : 'general'
  );
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = useCallback(() => {
    apiFetch<SupportTicket[]>('/api/v1/support-tickets').then(setTickets).catch(() => {});
  }, [apiFetch]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await apiFetch<SupportTicket>('/api/v1/support-tickets', {
        method: 'POST',
        body: JSON.stringify({ type, orderId: orderId.trim() || undefined, subject, details }),
      });
      setTickets((prev) => [created, ...prev]);
      setSubject('');
      setDetails('');
      setOrderId('');
      showToast(lang === 'bn' ? 'সাপোর্ট টিকেট তৈরি হয়েছে' : 'Support ticket submitted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ticket submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <section className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECEAF0] space-y-2">
        <p className="text-xs font-semibold text-[#1E5A40] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          {lang === 'bn' ? 'কাস্টমার কেয়ার, ডেলিভারি ও রিটার্ন সেন্টার' : 'Customer Care, Shipping & 7-Day Return Policy'}
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-[#29243B]">
          {lang === 'bn' ? 'সাপোর্ট ও রিটার্ন সহায়তা কেন্দ্র' : 'Support, Shipping & Return Center'}
        </h1>
        <p className="text-sm text-[#777486]">
          {lang === 'bn'
            ? 'ডেলিভারি সময়সীমা, রিটার্ন নীতি এবং যেকোনো অর্ডার সংক্রান্ত সহায়তা এখানে পাবেন।'
            : 'Clear Bangladesh nationwide shipping rules, 7-day easy return eligibility, and live support ticket tracking.'}
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-3">
          <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#1E5A40]" />
            {lang === 'bn' ? 'বাংলাদেশ শিপিং নীতি' : 'Bangladesh Shipping Policy'}
          </h2>
          <ul className="space-y-2 text-xs text-[#777486] leading-relaxed">
            <li>• Dhaka Metro: ৳60 flat delivery (24–48 hours via Steadfast / Pathao / RedX sandbox).</li>
            <li>• Outside Dhaka (All 64 Districts): ৳120 flat delivery (2–4 business days).</li>
            <li>• Free nationwide delivery automatically applies on subtotals of ৳2,500 or above.</li>
            <li>• Cash on Delivery (COD) stays marked unpaid until confirmed delivered by courier/seller.</li>
          </ul>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-3">
          <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#D93B52]" />
            {lang === 'bn' ? '৭ দিনের সহজ রিটার্ন ও রিফান্ড' : '7-Day Return & Refund Policy'}
          </h2>
          <ul className="space-y-2 text-xs text-[#777486] leading-relaxed">
            <li>• Unopened, unused apparel, gear, and accessories are eligible within 7 days of delivery.</li>
            <li>• Damaged, wrong size, or defective items qualify for free replacement or sandbox refund.</li>
            <li>• Opened diapers, hygiene items, or baby food are non-returnable unless defective on arrival.</li>
            <li>• Doctor consultations cancelled at least 2 hours ahead receive an automatic sandbox refund.</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
          <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#D93B52]" />
            {lang === 'bn' ? 'নতুন সাপোর্ট / রিটার্ন টিকেট খুলুন' : 'Submit a Support or Return Request'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-[#29243B]">Request Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SupportTicket['type'])}
                className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs text-[#29243B]"
              >
                <option value="return">Product Return</option>
                <option value="refund">Refund Request</option>
                <option value="cancel">Order Cancellation</option>
                <option value="general">General Help</option>
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-[#29243B]">Order ID (Optional)</span>
              <input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g., ORD-1001"
                className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs text-[#29243B]"
              />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-xs font-semibold text-[#29243B]">Subject *</span>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your request"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs font-semibold text-[#29243B]">Details *</span>
            <textarea
              required
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the item, issue, or question..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-2xl bg-[#E83F58] hover:bg-[#D93B52] text-white text-xs font-semibold transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>

        <section className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
          <h2 className="text-base font-display font-semibold text-[#29243B]">
            {lang === 'bn' ? 'আপনার টিকেটসমূহ' : 'Your Support Tickets'}
          </h2>
          {tickets.length === 0 ? (
            <p className="text-sm text-[#777486]">No tickets submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((tkt) => (
                <div key={tkt.id} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono-num font-bold text-[#29243B]">
                      {tkt.id} {tkt.orderId ? `· ${tkt.orderId}` : ''}
                    </span>
                    <span className="text-xs font-semibold text-[#1E5A40] capitalize">{tkt.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#29243B]">{tkt.subject}</p>
                  <p className="text-xs text-[#777486]">{tkt.details}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
