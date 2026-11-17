import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Package, RotateCcw, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { calculateOrderTotalWithCoupon, formatBdt } from '../lib/domain';
import type { CouponCode, OrderItem, ProductItem } from '../types/platform';

const BD_DISTRICTS = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh'];

export const CartPage: React.FC = () => {
  const { lang, cart, updateCartQty, removeFromCart, apiFetch } = useApp();
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    apiFetch<{ products: ProductItem[] }>('/api/v1/products')
      .then((res) => setProducts(res.products))
      .catch(() => {});
  }, [apiFetch]);

  const enriched = cart
    .map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.productId),
    }))
    .filter((entry) => Boolean(entry.product));

  const subtotal = enriched.reduce(
    (sum, item) => sum + (item.product?.priceBdt ?? 0) * item.quantity,
    0
  );
  const freeRemaining = Math.max(0, 2500 - subtotal);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-semibold text-[#29243B]">{t(lang, 'cart')}</h1>
        {enriched.length > 0 && (
          <p className="text-xs font-semibold text-[#1E5A40]">
            {freeRemaining === 0
              ? lang === 'bn'
                ? 'ফ্রি ডেলিভারি আনলক হয়েছে!'
                : 'Free nationwide delivery unlocked!'
              : lang === 'bn'
                ? `আরও ${formatBdt(freeRemaining, lang)} যোগ করলে ফ্রি ডেলিভারি`
                : `Add ${formatBdt(freeRemaining, lang)} more for free shipping`}
          </p>
        )}
      </div>

      {enriched.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#ECEAF0] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFE3D9] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6 text-[#E83F58]" />
          </div>
          <p className="text-sm text-[#777486]">
            {lang === 'bn' ? 'আপনার শপিং ব্যাগ এখনো খালি।' : 'Your shopping bag is currently empty.'}
          </p>
          <Link
            to="/marketplace"
            className="inline-block px-5 py-2.5 rounded-2xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
          >
            {lang === 'bn' ? 'মার্কেটপ্লেস দেখুন' : 'Browse Marketplace'}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl divide-y divide-[#ECEAF0] border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)]">
            {enriched.map((item) => (
              <div key={`${item.productId}_${item.variant}`} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={item.product!.imageUrl}
                    alt={item.product!.titleEn}
                    className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-[#FAF9F6]"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#29243B] truncate">
                      {lang === 'bn' ? item.product!.titleBn : item.product!.titleEn}
                    </p>
                    <p className="text-xs text-[#777486]">
                      {item.variant} · {item.product!.shopName}
                    </p>
                    <p className="text-xs font-bold text-[#E83F58] tabular-nums mt-0.5">
                      {formatBdt(item.product!.priceBdt, lang)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => updateCartQty(item.productId, item.variant, -1)}
                    className="w-8 h-8 rounded-xl border border-[#ECEAF0] hover:border-[#B8A5F5] text-sm font-semibold text-[#29243B]"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums text-[#29243B]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateCartQty(item.productId, item.variant, 1)}
                    className="w-8 h-8 rounded-xl border border-[#ECEAF0] hover:border-[#B8A5F5] text-sm font-semibold text-[#29243B]"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId, item.variant)}
                    aria-label="Remove item"
                    className="p-2 text-[#777486] hover:text-[#E83F58]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#ECEAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_6px_22px_rgba(41,36,59,0.04)]">
            <div>
              <p className="text-xs text-[#777486]">{lang === 'bn' ? 'মোট পণ্যের মূল্য' : 'Subtotal'}</p>
              <p className="text-xl font-bold text-[#29243B] tabular-nums">{formatBdt(subtotal, lang)}</p>
            </div>
            <Link
              to="/checkout"
              className="px-6 py-3 rounded-2xl bg-[#E83F58] hover:bg-[#D93B52] text-white text-sm font-semibold text-center transition-colors"
            >
              {t(lang, 'checkout')} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export const CheckoutPage: React.FC = () => {
  const { lang, cart, clearCart, viewerName, apiFetch, showToast } = useApp();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [buyerName, setBuyerName] = useState(viewerName);
  const [phone, setPhone] = useState('01712345678');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Dhanmondi');
  const [area, setArea] = useState('Road 7, House 14');
  const [postalCode, setPostalCode] = useState('1205');
  const [courierProvider, setCourierProvider] = useState<'steadfast_sandbox' | 'pathao_sandbox' | 'redx_sandbox'>('steadfast_sandbox');
  const [paymentMethod, setPaymentMethod] = useState<'bkash_sandbox' | 'nagad_sandbox' | 'card_sandbox' | 'cod'>('bkash_sandbox');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponCode | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ products: ProductItem[] }>('/api/v1/products').then((res) => setProducts(res.products));
  }, [apiFetch]);

  const subtotal = cart.reduce((sum, item) => {
    const p = products.find((pr) => pr.id === item.productId);
    return sum + (p?.priceBdt ?? 0) * item.quantity;
  }, 0);

  const calc = calculateOrderTotalWithCoupon({
    subtotalBdt: subtotal,
    district,
    coupon: appliedCoupon ?? undefined,
  });

  const handleApplyCoupon = async () => {
    setCouponError(null);
    if (!couponInput.trim()) return;
    try {
      const res = await apiFetch<{ coupon: CouponCode; discountBdt: number }>('/api/v1/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponInput.trim(), subtotalBdt: subtotal }),
      });
      setAppliedCoupon(res.coupon);
      showToast(`Coupon ${res.coupon.code} applied (-${formatBdt(res.discountBdt, lang)})`);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch<OrderItem>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          buyerName,
          phone,
          district,
          upazila,
          area,
          postalCode,
          paymentMethod,
          courierProvider,
          couponCode: appliedCoupon?.code,
          items: cart,
        }),
      });
      clearCart();
      showToast(lang === 'bn' ? 'অর্ডার সফলভাবে সম্পন্ন হয়েছে!' : 'Order placed successfully!');
      navigate('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-display font-semibold text-[#29243B]">{t(lang, 'checkout')}</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 bg-white rounded-3xl p-6 border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)] space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-[#FFE3D9] text-[#E83F58] text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="chk-name" className="block text-xs font-semibold text-[#29243B] mb-1">
                Full Name
              </label>
              <input
                id="chk-name"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
              />
            </div>
            <div>
              <label htmlFor="chk-phone" className="block text-xs font-semibold text-[#29243B] mb-1">
                BD Mobile Number
              </label>
              <input
                id="chk-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="chk-dist" className="block text-xs font-semibold text-[#29243B] mb-1">
                District
              </label>
              <select
                id="chk-dist"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
              >
                {BD_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="chk-upz" className="block text-xs font-semibold text-[#29243B] mb-1">
                Upazila / Thana
              </label>
              <input
                id="chk-upz"
                required
                value={upazila}
                onChange={(e) => setUpazila(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="chk-area" className="block text-xs font-semibold text-[#29243B] mb-1">
                Area / Street Address
              </label>
              <input
                id="chk-area"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
              />
            </div>
            <div>
              <label htmlFor="chk-post" className="block text-xs font-semibold text-[#29243B] mb-1">
                Postal Code
              </label>
              <input
                id="chk-post"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label htmlFor="chk-courier" className="block text-xs font-semibold text-[#29243B]">
              Courier Partner (Bangladesh Sandbox)
            </label>
            <select
              id="chk-courier"
              value={courierProvider}
              onChange={(e) => setCourierProvider(e.target.value as typeof courierProvider)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            >
              <option value="steadfast_sandbox">Steadfast Courier (Sandbox)</option>
              <option value="pathao_sandbox">Pathao Parcel (Sandbox)</option>
              <option value="redx_sandbox">RedX Logistics (Sandbox)</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-[#29243B]">
              Payment Method ({t(lang, 'sandboxPaymentNotice')})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'bkash_sandbox', label: 'bKash (Sandbox)' },
                { id: 'nagad_sandbox', label: 'Nagad (Sandbox)' },
                { id: 'card_sandbox', label: 'Visa / Mastercard (Sandbox)' },
                { id: 'cod', label: 'Cash on Delivery (COD)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as typeof paymentMethod)}
                  className={`p-3 rounded-2xl text-xs font-semibold border text-left transition-colors ${
                    paymentMethod === m.id
                      ? 'bg-[#29243B] text-white border-[#29243B]'
                      : 'bg-[#FAF9F6] border-[#ECEAF0] text-[#29243B] hover:border-[#B8A5F5]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {paymentMethod === 'cod' && (
              <p className="text-[11px] font-medium text-[#E83F58]">{t(lang, 'codUnpaidNotice')}</p>
            )}
          </div>
        </div>

        <div className="md:col-span-5 bg-white rounded-3xl p-6 border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)] space-y-5 h-fit">
          <h2 className="text-base font-display font-semibold text-[#29243B]">Order Summary</h2>

          {/* Coupon Code */}
          <div className="space-y-1.5">
            <label htmlFor="chk-coupon" className="text-xs font-semibold text-[#29243B] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#D93B52]" />
              {lang === 'bn' ? 'কুপন কোড (যেমন WELCOME10)' : 'Promo / Coupon Code'}
            </label>
            <div className="flex gap-2">
              <input
                id="chk-coupon"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="WELCOME10 / NEWBORN15 / SAVE200"
                className="flex-1 px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs uppercase font-mono-num"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-3.5 py-2 rounded-xl bg-[#29243B] text-white text-xs font-semibold hover:bg-[#E83F58]"
              >
                Apply
              </button>
            </div>
            {couponError && <p className="text-[11px] text-[#E83F58] font-medium">{couponError}</p>}
            {appliedCoupon && (
              <p className="text-[11px] text-[#1E5A40] font-semibold">
                Applied {appliedCoupon.code}: -{formatBdt(calc.discountBdt, lang)}
              </p>
            )}
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#777486]">Subtotal</span>
              <span className="tabular-nums font-semibold text-[#29243B]">{formatBdt(subtotal, lang)}</span>
            </div>
            {calc.discountBdt > 0 && (
              <div className="flex justify-between text-[#1E5A40]">
                <span>Coupon Discount</span>
                <span className="tabular-nums font-semibold">-{formatBdt(calc.discountBdt, lang)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#777486]">Delivery ({district})</span>
              <span className="tabular-nums font-semibold text-[#29243B]">{formatBdt(calc.deliveryFeeBdt, lang)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-[#ECEAF0] text-base font-bold text-[#29243B]">
              <span>Total</span>
              <span className="tabular-nums text-[#E83F58]">{formatBdt(calc.totalBdt, lang)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || cart.length === 0}
            className="w-full py-3 rounded-2xl bg-[#E83F58] hover:bg-[#D93B52] text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            {submitting ? t(lang, 'loading') : lang === 'bn' ? 'অর্ডার কনফার্ম করুন' : 'Confirm Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const OrdersPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [returnOrder, setReturnOrder] = useState<OrderItem | null>(null);
  const [reason, setReason] = useState('');

  const loadOrders = useCallback(() => {
    apiFetch<OrderItem[]>('/api/v1/orders').then(setOrders).catch(() => {});
  }, [apiFetch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleReturnTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnOrder || !reason.trim()) return;
    await apiFetch('/api/v1/support-tickets', {
      method: 'POST',
      body: JSON.stringify({
        orderId: returnOrder.id,
        type: 'return',
        subject: `Return / Support request for ${returnOrder.id}`,
        details: reason.trim(),
      }),
    });
    setReturnOrder(null);
    setReason('');
    showToast(lang === 'bn' ? 'রিটার্ন/সাপোর্ট অনুরোধ পাঠানো হয়েছে' : 'Return / Support ticket submitted');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-semibold text-[#29243B]">{t(lang, 'orders')}</h1>
        <Link to="/support" className="text-xs font-semibold text-[#D93B52] hover:underline">
          {lang === 'bn' ? 'আমার সাপোর্ট টিকেট →' : 'View Support Tickets →'}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-[#ECEAF0]">
          <p className="text-sm text-[#777486]">No orders placed yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)] space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEAF0] pb-3">
                <div>
                  <p className="text-sm font-semibold text-[#29243B] flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#E83F58]" />
                    <span className="font-mono-num">{order.id}</span>
                    {order.couponCode && (
                      <span className="text-[11px] font-semibold text-[#1E5A40]">({order.couponCode})</span>
                    )}
                  </p>
                  <p className="text-xs text-[#777486] mt-0.5">
                    {order.district}, {order.upazila} · {order.paymentMethod} · Payment:{' '}
                    <span className="font-semibold text-[#29243B]">{order.paymentStatus}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-base font-bold text-[#29243B] tabular-nums">{formatBdt(order.totalBdt, lang)}</p>
                    <p className="text-xs font-semibold text-[#1E5A40] capitalize">{order.status}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReturnOrder(order)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#ECEAF0] hover:border-[#E83F58] text-xs font-semibold text-[#29243B]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Return / Help
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {order.subOrders.map((sub) => (
                  <div
                    key={sub.subOrderId}
                    className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#29243B] flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#1E5A40]" />
                        {sub.shopName}
                      </p>
                      <p className="text-xs text-[#777486] mt-0.5">
                        {sub.items.map((i) => `${lang === 'bn' ? i.titleBn : i.titleEn} × ${i.quantity}`).join(', ')}
                      </p>
                      {sub.courierRef && (
                        <p className="text-[11px] text-[#777486] font-mono-num mt-0.5">
                          Sandbox Tracking: {sub.courierRef}
                        </p>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-[#1E5A40] flex items-center gap-1.5 capitalize">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {sub.status}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {returnOrder && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-[#29243B]/55 flex items-center justify-center p-4">
          <form onSubmit={handleReturnTicket} className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 border border-[#ECEAF0]">
            <h2 className="text-lg font-semibold text-[#29243B]">
              Return or Support for {returnOrder.id}
            </h2>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why you need a return, exchange, or refund..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReturnOrder(null)}
                className="px-4 py-2 rounded-xl border border-[#ECEAF0] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#E83F58] text-white text-xs font-semibold"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
