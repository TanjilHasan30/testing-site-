import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FolderPlus,
  LifeBuoy,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MARKETPLACE_CATEGORIES } from '../i18n/translations';
import { formatBdt, formatCount } from '../lib/domain';
import type {
  AppointmentItem,
  AuditLogItem,
  BrandProfile,
  CategoryConfig,
  DoctorProfile,
  OrderItem,
  PlatformSettings,
  PostItem,
  ProductItem,
  ReportItem,
  SellerProfile,
  SubOrderStatus,
  SupportTicket,
} from '../types/platform';

const SUB_ORDER_STATUSES: SubOrderStatus[] = [
  'pending',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

export const SellerDashboardPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);

  const [titleEn, setTitleEn] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [priceBdt, setPriceBdt] = useState('950');
  const [compareAtBdt, setCompareAtBdt] = useState('');
  const [category, setCategory] = useState('baby_clothing');
  const [stock, setStock] = useState('20');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editCompareAt, setEditCompareAt] = useState('');
  const [editStock, setEditStock] = useState('');

  const loadData = useCallback(() => {
    Promise.all([
      apiFetch<OrderItem[]>('/api/v1/orders'),
      apiFetch<{ products: ProductItem[]; categories: CategoryConfig[] }>('/api/v1/products'),
    ])
      .then(([ords, prodData]) => {
        setOrders(ords);
        setProducts(prodData.products);
        setCategories(prodData.categories);
      })
      .catch(() => {});
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await apiFetch<ProductItem>('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify({
        titleEn,
        titleBn: titleBn || titleEn,
        category,
        priceBdt: Number(priceBdt),
        compareAtBdt: compareAtBdt ? Number(compareAtBdt) : undefined,
        stock: Number(stock),
      }),
    });
    setProducts((prev) => [created, ...prev]);
    setTitleEn('');
    setTitleBn('');
    setCompareAtBdt('');
    showToast(lang === 'bn' ? 'নতুন পণ্য মার্কেটপ্লেসে যুক্ত হয়েছে' : 'Product published to Marketplace');
  };

  const handleSaveEdit = async (productId: string) => {
    const updated = await apiFetch<ProductItem>(`/api/v1/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        priceBdt: Number(editPrice),
        compareAtBdt: editCompareAt ? Number(editCompareAt) : 0,
        stock: Number(editStock),
      }),
    });
    setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
    setEditingId(null);
    showToast(lang === 'bn' ? 'পণ্যের মূল্য ও স্টক আপডেট হয়েছে' : 'Product price & stock updated');
  };

  const handleUpdateSubOrder = async (orderId: string, subOrderId: string, status: SubOrderStatus) => {
    const updated = await apiFetch<OrderItem>(`/api/v1/orders/${orderId}/suborders/${subOrderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, collectCodPayment: status === 'delivered' }),
    });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    showToast(`Sub-order updated to ${status}`);
  };

  const lowStockProducts = products.filter((p) => p.stock <= 10);
  const sellerNetTotal = orders.reduce(
    (sum, o) => sum + o.subOrders.reduce((s, sub) => s + sub.sellerNetBdt, 0),
    0
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-[#FFE3D9] flex items-center justify-center">
            <Store className="w-5 h-5 text-[#E83F58]" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-semibold text-[#29243B]">
              {lang === 'bn' ? 'সেলার ড্যাশবোর্ড ও ইনভেন্টরি' : 'Seller Hub, Inventory & Orders'}
            </h1>
            <p className="text-xs text-[#777486]">
              {lang === 'bn' ? 'মূল্য, স্টক ও সাব-অর্ডার ডেলিভারি পরিচালনা করুন' : 'Manage pricing, discounts, low-stock alerts & sub-order fulfillment'}
            </p>
          </div>
        </div>
        <Link
          to="/seller/register"
          className="px-4 py-2 rounded-xl bg-white border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-semibold text-[#29243B]"
        >
          {lang === 'bn' ? 'নতুন সেলার নিবন্ধন' : 'Register Another Shop'}
        </Link>
      </div>

      {/* Seller KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Products', value: String(products.length) },
          { label: 'Low Stock Alerts', value: String(lowStockProducts.length) },
          { label: 'Total Sub-Orders', value: String(orders.reduce((s, o) => s + o.subOrders.length, 0)) },
          { label: 'Seller Net Revenue', value: formatBdt(sellerNetTotal, lang) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-[#ECEAF0]">
            <p className="text-xs text-[#777486]">{kpi.label}</p>
            <p className="text-xl font-bold text-[#29243B] tabular-nums mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="rounded-2xl bg-[#FFE3D9]/55 border border-[#FF6478]/30 px-4 py-3 flex items-center gap-2.5 text-xs text-[#29243B]">
          <AlertTriangle className="w-4 h-4 text-[#D93B52] shrink-0" />
          <span>
            <strong>Low Stock Alert:</strong>{' '}
            {lowStockProducts.map((p) => `${p.titleEn} (${p.stock} left)`).join(', ')}
          </span>
        </div>
      )}

      {/* Publish New Product */}
      <form
        onSubmit={handleAddProduct}
        className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4"
      >
        <h2 className="text-base font-display font-semibold text-[#29243B]">Add New Product</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            required
            placeholder="Product Title (English)"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] sm:col-span-2"
          />
          <input
            placeholder="Title (Bengali - optional)"
            value={titleBn}
            onChange={(e) => setTitleBn(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
          />
          <input
            required
            type="number"
            min={50}
            placeholder="Price (BDT)"
            value={priceBdt}
            onChange={(e) => setPriceBdt(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] tabular-nums"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
          >
            {(categories.length > 0
              ? categories.map((c) => [c.slug, { bn: c.nameBn, en: c.nameEn }] as const)
              : Object.entries(MARKETPLACE_CATEGORIES).filter(([k]) => k !== 'all')
            ).map(([k, v]) => (
              <option key={k} value={k}>
                {v[lang]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={0}
            placeholder="Compare-at Price (BDT)"
            value={compareAtBdt}
            onChange={(e) => setCompareAtBdt(e.target.value)}
            aria-label="Compare-at price"
            className="w-48 px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] tabular-nums"
          />
          <input
            type="number"
            min={1}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            aria-label="Initial stock"
            className="w-28 px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] tabular-nums"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#E83F58] hover:bg-[#D93B52] text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Publish Product
          </button>
        </div>
      </form>

      {/* Live Inventory & Inline Edit */}
      <section className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
        <h2 className="text-base font-display font-semibold text-[#29243B]">Catalog Inventory &amp; Discounts</h2>
        <div className="space-y-2.5">
          {products.slice(0, 8).map((prod) => {
            const isEditing = editingId === prod.id;
            return (
              <div
                key={prod.id}
                className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img src={prod.imageUrl} alt={prod.titleEn} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#29243B] truncate">
                      {lang === 'bn' ? prod.titleBn : prod.titleEn}
                    </p>
                    <p className="text-xs text-[#777486] tabular-nums">
                      {formatBdt(prod.priceBdt, lang)}
                      {prod.compareAtBdt ? ` (Was ${formatBdt(prod.compareAtBdt, lang)})` : ''} · Stock: {prod.stock}
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      aria-label="Edit price"
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-white border border-[#ECEAF0] text-xs tabular-nums"
                    />
                    <input
                      type="number"
                      value={editCompareAt}
                      onChange={(e) => setEditCompareAt(e.target.value)}
                      placeholder="Compare"
                      aria-label="Edit compare-at price"
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-white border border-[#ECEAF0] text-xs tabular-nums"
                    />
                    <input
                      type="number"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      aria-label="Edit stock"
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-[#ECEAF0] text-xs tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(prod.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#1E5A40] text-white text-xs font-semibold"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#ECEAF0] text-xs font-semibold text-[#29243B]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(prod.id);
                      setEditPrice(String(prod.priceBdt));
                      setEditCompareAt(prod.compareAtBdt ? String(prod.compareAtBdt) : '');
                      setEditStock(String(prod.stock));
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-[#ECEAF0] hover:border-[#B8A5F5] text-xs font-semibold text-[#29243B] self-start md:self-center"
                  >
                    Edit Price / Stock
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Incoming Seller Sub-Orders */}
      <div className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
        <h2 className="text-base font-display font-semibold text-[#29243B]">Incoming Seller Sub-Orders</h2>
        <div className="space-y-3">
          {orders.map((order) =>
            order.subOrders.map((sub) => (
              <div
                key={sub.subOrderId}
                className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-semibold font-mono-num text-[#29243B]">
                    {order.id} · {sub.shopName} {sub.courierRef ? `· ${sub.courierRef}` : ''}
                  </p>
                  <p className="text-xs text-[#777486] mt-0.5">
                    Net Payout: {formatBdt(sub.sellerNetBdt, lang)} (Platform Fee: {formatBdt(sub.commissionBdt, lang)}) · Status:{' '}
                    <span className="font-semibold text-[#29243B] capitalize">{sub.status}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Update status for ${sub.subOrderId}`}
                    value={sub.status}
                    onChange={(e) => handleUpdateSubOrder(order.id, sub.subOrderId, e.target.value as SubOrderStatus)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#ECEAF0] text-xs font-semibold text-[#29243B]"
                  >
                    {SUB_ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleUpdateSubOrder(order.id, sub.subOrderId, 'delivered')}
                    className="px-3.5 py-1.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
                  >
                    Mark Delivered
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const CreatorDashboardPage: React.FC = () => {
  const { lang, viewerId, showToast } = useApp();
  const referralLink = `${window.location.origin}/marketplace?ref=${viewerId}`;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-display font-semibold text-[#29243B] flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-[#E83F58]" />
          {lang === 'bn' ? 'ক্রিয়েটর ও অ্যাফিলিয়েট ড্যাশবোর্ড' : 'Creator & Affiliate Studio'}
        </h1>
        <p className="text-xs text-[#777486]">
          {lang === 'bn'
            ? 'আয় নিশ্চিত নয়; প্রতিটি যোগ্য পণ্যের বিক্রয়ের ওপর ভিত্তি করে কমিশন হিসাব করা হয়।'
            : 'Earnings are variable and not guaranteed; affiliate payouts depend on verified non-self-referred purchases.'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Followers', val: '1,840' },
          { label: 'Post & Reel Views', val: '18.4k' },
          { label: 'Affiliate Clicks', val: '312' },
          { label: 'Approved Commission', val: formatBdt(2480, lang) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-[#ECEAF0]">
            <p className="text-xs text-[#777486]">{kpi.label}</p>
            <p className="text-xl font-bold text-[#29243B] tabular-nums mt-1">{kpi.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-3">
        <h2 className="text-base font-display font-semibold text-[#29243B]">Unique Affiliate Referral Link</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={referralLink}
            aria-label="Affiliate referral link"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs font-mono-num text-[#29243B]"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(referralLink).catch(() => {});
              showToast('Affiliate link copied');
            }}
            className="px-4 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
};

export const DoctorDashboardPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);

  useEffect(() => {
    apiFetch<AppointmentItem[]>('/api/v1/appointments').then(setAppointments).catch(() => {});
  }, [apiFetch]);

  const markCompleted = async (id: string) => {
    const updated = await apiFetch<AppointmentItem>(`/api/v1/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    showToast('Consultation marked completed');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-display font-semibold text-[#29243B]">
        {lang === 'bn' ? 'ডাক্তার কনসালটেশন ড্যাশবোর্ড' : 'Doctor Consultation Dashboard'}
      </h1>
      <div className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-3">
        {appointments.map((a) => (
          <div
            key={a.id}
            className="p-4 rounded-2xl bg-[#EFF8F3] border border-[#B8DCCB] flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-semibold text-[#29243B]">{a.patientName}</p>
              <p className="text-xs text-[#1E5A40] tabular-nums mt-0.5">
                {a.date} · {a.slot} · {a.consultationType} · Status: {a.status}
              </p>
            </div>
            {a.status === 'confirmed' && (
              <button
                type="button"
                onClick={() => markCompleted(a.id)}
                className="px-3.5 py-2 rounded-xl bg-[#29243B] hover:bg-[#1E5A40] text-white text-xs font-semibold transition-colors"
              >
                Complete Visit
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

type AdminTab = 'overview' | 'sellers' | 'categories' | 'doctors' | 'moderation' | 'settings';

export const AdminDashboardPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<{
    metrics: Record<string, number>;
    reports: ReportItem[];
    doctors: DoctorProfile[];
    sellers: SellerProfile[];
    brands: BrandProfile[];
    categories: CategoryConfig[];
    supportTickets: SupportTicket[];
    settings: PlatformSettings;
    posts: PostItem[];
    orders: OrderItem[];
    auditLogs: AuditLogItem[];
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ label: string; run: () => Promise<void> } | null>(null);

  const [newCatEn, setNewCatEn] = useState('');
  const [newCatBn, setNewCatBn] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatSubs, setNewCatSubs] = useState('');

  const [commissionInput, setCommissionInput] = useState('10');
  const [freeShipInput, setFreeShipInput] = useState('2500');
  const [dhakaShipInput, setDhakaShipInput] = useState('60');
  const [outsideShipInput, setOutsideShipInput] = useState('120');

  const loadOverview = useCallback(() => {
    apiFetch<NonNullable<typeof data>>('/api/v1/admin/overview')
      .then((res) => {
        setData(res);
        setCommissionInput(String(res.settings.defaultCommissionPct));
        setFreeShipInput(String(res.settings.freeDeliveryThresholdBdt));
        setDhakaShipInput(String(res.settings.dhakaDeliveryBdt));
        setOutsideShipInput(String(res.settings.outsideDhakaDeliveryBdt));
      })
      .catch(() => {});
  }, [apiFetch]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/categories', {
        method: 'POST',
        body: JSON.stringify({
          nameEn: newCatEn,
          nameBn: newCatBn || newCatEn,
          slug: newCatSlug || undefined,
          subCategories: newCatSubs
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      setNewCatEn('');
      setNewCatBn('');
      setNewCatSlug('');
      setNewCatSubs('');
      loadOverview();
      window.dispatchEvent(new Event('mc:categories-updated'));
      showToast(lang === 'bn' ? 'নতুন ক্যাটাগরি যোগ করা হয়েছে' : 'Category added live to Mega Menu & Shop');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/v1/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        defaultCommissionPct: Number(commissionInput),
        freeDeliveryThresholdBdt: Number(freeShipInput),
        dhakaDeliveryBdt: Number(dhakaShipInput),
        outsideDhakaDeliveryBdt: Number(outsideShipInput),
      }),
    });
    loadOverview();
    showToast('Platform commission & delivery settings saved');
  };

  if (!data) return <div className="p-8 text-center text-sm text-[#777486]">Loading Admin Panel...</div>;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-semibold text-[#29243B] flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-[#E83F58]" />
          Mother &amp; Child Admin &amp; Ecosystem Console
        </h1>

        <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-2xl border border-[#ECEAF0]">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'sellers', label: `Sellers (${data.sellers.length})` },
              { id: 'categories', label: `Categories (${data.categories.length})` },
              { id: 'doctors', label: `Doctors (${data.doctors.length})` },
              { id: 'moderation', label: `Reports & Tickets (${data.reports.length + data.supportTickets.length})` },
              { id: 'settings', label: 'Commission & Delivery' },
            ] as const
          ).map((tItem) => (
            <button
              key={tItem.id}
              type="button"
              onClick={() => setTab(tItem.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                tab === tItem.id ? 'bg-[#29243B] text-white' : 'text-[#29243B] hover:bg-[#FAF9F6]'
              }`}
            >
              {tItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Users', val: formatCount(data.metrics.totalUsers, lang) },
          { label: 'Products', val: formatCount(data.metrics.totalProducts, lang) },
          { label: 'Orders', val: formatCount(data.metrics.totalOrders, lang) },
          { label: 'GMV', val: formatBdt(data.metrics.gmvBdt, lang) },
          { label: 'Platform Fee', val: formatBdt(data.metrics.platformRevenueBdt, lang) },
          { label: 'Open Tickets', val: formatCount(data.metrics.openTickets, lang) },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl p-4 border border-[#ECEAF0]">
            <p className="text-[11px] text-[#777486]">{m.label}</p>
            <p className="text-lg font-bold text-[#29243B] tabular-nums mt-1">{m.val}</p>
          </div>
        ))}
      </div>

      {/* Sellers Onboarding Tab */}
      {(tab === 'overview' || tab === 'sellers') && (
        <section className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
              <Store className="w-4 h-4 text-[#D93B52]" />
              Seller Onboarding &amp; Shop Approvals
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.sellers.map((sel) => (
              <div key={sel.id} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#29243B]">{sel.shopName}</p>
                  <p className="text-xs text-[#777486]">
                    {sel.district} · {sel.businessType || 'Marketplace Seller'} · Commission {sel.commissionRatePct}%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      label: `${sel.isApproved ? 'Suspend' : 'Approve'} seller "${sel.shopName}"?`,
                      run: async () => {
                        await apiFetch(`/api/v1/admin/sellers/${sel.id}/approve`, {
                          method: 'PATCH',
                          body: JSON.stringify({ isApproved: !sel.isApproved }),
                        });
                        loadOverview();
                        showToast('Seller status updated');
                      },
                    })
                  }
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    sel.isApproved
                      ? 'bg-[#EFF8F3] text-[#1E5A40] border border-[#B8DCCB]'
                      : 'bg-[#E83F58] text-white'
                  }`}
                >
                  {sel.isApproved ? 'Approved' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dynamic Categories Tab */}
      {(tab === 'overview' || tab === 'categories') && (
        <section className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#D93B52]" />
              Dynamic Shop Categories (No-Code Expansion)
            </h2>
            <p className="text-xs text-[#777486]">
              Add or remove marketplace categories at runtime — updates the Shop Mega Menu &amp; Marketplace filters immediately.
            </p>
          </div>

          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              required
              placeholder="Category Name (English) *"
              value={newCatEn}
              onChange={(e) => setNewCatEn(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            />
            <input
              placeholder="Name (Bengali)"
              value={newCatBn}
              onChange={(e) => setNewCatBn(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            />
            <input
              placeholder="Slug (auto if blank)"
              value={newCatSlug}
              onChange={(e) => setNewCatSlug(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            />
            <input
              placeholder="Sub-categories (comma separated)"
              value={newCatSubs}
              onChange={(e) => setNewCatSubs(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
            >
              Add Category
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.categories.map((cat) => (
              <div key={cat.slug} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#29243B] truncate">
                    {cat.nameEn} · {cat.nameBn}
                  </p>
                  <p className="text-[11px] text-[#777486] font-mono-num truncate">
                    /{cat.slug} · {cat.subCategories.slice(0, 2).join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete category ${cat.nameEn}`}
                  onClick={() =>
                    setConfirmAction({
                      label: `Remove category "${cat.nameEn}" from the marketplace?`,
                      run: async () => {
                        await apiFetch(`/api/v1/categories/${cat.slug}`, { method: 'DELETE' });
                        loadOverview();
                        window.dispatchEvent(new Event('mc:categories-updated'));
                        showToast('Category deleted');
                      },
                    })
                  }
                  className="p-2 rounded-lg text-[#777486] hover:text-[#D93B52]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Doctors & Moderation */}
      {(tab === 'overview' || tab === 'doctors' || tab === 'moderation') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(tab === 'overview' || tab === 'doctors') && (
            <section className="bg-white rounded-3xl p-5 border border-[#ECEAF0] space-y-3">
              <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1E5A40]" />
                Doctor Verification Queue
              </h2>
              {data.doctors.map((doc) => (
                <div key={doc.id} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#29243B]">{doc.nameEn}</p>
                    <p className="text-[11px] text-[#777486]">
                      {doc.qualifications} · {doc.specialisation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({
                        label: `${doc.isVerified ? 'Revoke' : 'Approve'} verification for ${doc.nameEn}?`,
                        run: async () => {
                          await apiFetch(`/api/v1/admin/doctors/${doc.id}/verify`, {
                            method: 'PATCH',
                            body: JSON.stringify({ isVerified: !doc.isVerified }),
                          });
                          loadOverview();
                          showToast('Doctor verification updated');
                        },
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      doc.isVerified
                        ? 'bg-[#EFF8F3] text-[#1E5A40] border border-[#B8DCCB]'
                        : 'bg-[#29243B] text-white'
                    }`}
                  >
                    {doc.isVerified ? 'Verified' : 'Verify'}
                  </button>
                </div>
              ))}
            </section>
          )}

          {(tab === 'overview' || tab === 'moderation') && (
            <section className="bg-white rounded-3xl p-5 border border-[#ECEAF0] space-y-4">
              <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#E83F58]" />
                Moderation Reports &amp; Support Tickets
              </h2>
              {data.reports.map((rep) => (
                <div key={rep.id} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#29243B]">
                      {rep.targetType} ({rep.targetId}) — {rep.reason}
                    </p>
                    <p className="text-[11px] text-[#777486]">Status: {rep.status}</p>
                  </div>
                  {rep.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAction({
                          label: `Mark report ${rep.id} as resolved?`,
                          run: async () => {
                            await apiFetch(`/api/v1/admin/reports/${rep.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'resolved' }),
                            });
                            loadOverview();
                            showToast('Report resolved');
                          },
                        })
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))}

              <div className="pt-2 border-t border-[#ECEAF0] space-y-2">
                <p className="text-xs font-semibold text-[#29243B] flex items-center gap-1.5">
                  <LifeBuoy className="w-3.5 h-3.5 text-[#1E5A40]" />
                  Customer Return &amp; Support Tickets
                </p>
                {data.supportTickets.map((tkt) => (
                  <div key={tkt.id} className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#29243B] truncate">
                        {tkt.id} · {tkt.subject}
                      </p>
                      <p className="text-[11px] text-[#777486]">
                        {tkt.userName} · {tkt.type} · {tkt.status}
                      </p>
                    </div>
                    {tkt.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/v1/support-tickets/${tkt.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'resolved' }),
                          });
                          loadOverview();
                          showToast(`Ticket ${tkt.id} resolved`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#1E5A40] text-white text-xs font-semibold shrink-0"
                      >
                        Resolve Ticket
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Commission & Delivery Settings */}
      {(tab === 'overview' || tab === 'settings') && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
          <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#29243B]" />
            Platform Commission &amp; Bangladesh Delivery Rates
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-[#29243B]">Default Commission (%)</span>
              <input
                type="number"
                min={0}
                max={30}
                value={commissionInput}
                onChange={(e) => setCommissionInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm tabular-nums"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-[#29243B]">Free Delivery Threshold (BDT)</span>
              <input
                type="number"
                min={0}
                value={freeShipInput}
                onChange={(e) => setFreeShipInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm tabular-nums"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-[#29243B]">Dhaka Delivery (BDT)</span>
              <input
                type="number"
                min={0}
                value={dhakaShipInput}
                onChange={(e) => setDhakaShipInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm tabular-nums"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-[#29243B]">Outside Dhaka (BDT)</span>
              <input
                type="number"
                min={0}
                value={outsideShipInput}
                onChange={(e) => setOutsideShipInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm tabular-nums"
              />
            </label>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
          >
            Save Platform Settings
          </button>
        </form>
      )}

      {/* Orders Snapshot + Audit Trail */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-3xl p-5 border border-[#ECEAF0] space-y-2.5">
            <h2 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#D93B52]" />
              Recent Marketplace Orders
            </h2>
            {data.orders.slice(0, 5).map((ord) => (
              <div key={ord.id} className="text-xs flex items-center justify-between py-2 border-b border-[#ECEAF0] last:border-0">
                <span className="font-mono-num text-[#29243B] font-semibold">
                  {ord.id} · {ord.buyerName} ({ord.district})
                </span>
                <span className="tabular-nums font-semibold text-[#29243B]">
                  {formatBdt(ord.totalBdt, lang)} · {ord.status}
                </span>
              </div>
            ))}
          </section>

          <section className="bg-white rounded-3xl p-5 border border-[#ECEAF0] space-y-2">
            <h2 className="text-base font-display font-semibold text-[#29243B]">Admin Audit Trail</h2>
            {data.auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="text-xs text-[#777486] flex items-center gap-2 py-1.5 border-b border-[#ECEAF0] last:border-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1E5A40] shrink-0" />
                <span className="font-mono-num text-[11px] text-[#29243B]">{log.action}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{log.summary}</span>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* Sensitive Action Confirmation Modal */}
      {confirmAction && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-[#29243B]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 space-y-4 border border-[#ECEAF0] shadow-xl">
            <h3 className="text-base font-display font-semibold text-[#29243B]">Confirm Administrative Action</h3>
            <p className="text-sm text-[#777486]">{confirmAction.label}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl border border-[#ECEAF0] text-xs font-semibold text-[#29243B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await confirmAction.run();
                  setConfirmAction(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#E83F58] text-white text-xs font-semibold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
