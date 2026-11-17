import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, GitCompare, Heart, Image as ImageIcon, ShoppingBag, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { calculateProductDiscountPct, formatBdt } from '../lib/domain';
import type { ProductItem } from '../types/platform';

interface ProductCardProps {
  product: ProductItem;
  affiliateCode?: string;
  isCompared?: boolean;
  onToggleCompare?: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  affiliateCode,
  isCompared = false,
  onToggleCompare,
}) => {
  const { lang, addToCart, wishlistIds, toggleWishlist } = useApp();
  const [imgError, setImgError] = useState(false);

  const wished = wishlistIds.includes(product.id);
  const discountPct = calculateProductDiscountPct(product.priceBdt, product.compareAtBdt);
  const title = lang === 'bn' ? product.titleBn : product.titleEn;

  return (
    <article className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-[#ECEAF0] flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(41,36,59,0.08)]">
      <div className="relative">
        <Link to={`/products/${product.id}`} className="block relative aspect-[4/3] bg-[#FAF9F6] overflow-hidden">
          {!imgError && product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#FAF9F6]">
              <ImageIcon className="w-6 h-6 text-[#777486] mb-1.5" />
              <span className="text-xs text-[#777486] line-clamp-2">{title}</span>
            </div>
          )}
        </Link>

        {discountPct > 0 && (
          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#E83F58] text-white text-[10px] sm:text-[11px] font-semibold tabular-nums">
            -{discountPct}%
          </span>
        )}

        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={`Save ${product.titleEn} to wishlist`}
            className="w-8 h-8 rounded-full bg-white/95 border border-[#ECEAF0] flex items-center justify-center hover:bg-[#FFE3D9]/80 transition-colors"
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${wished ? 'fill-[#FF6478] text-[#FF6478]' : 'text-[#777486]'}`} />
          </button>

          {onToggleCompare && (
            <button
              type="button"
              onClick={() => onToggleCompare(product.id)}
              aria-label={`Compare ${product.titleEn}`}
              aria-pressed={isCompared}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                isCompared
                  ? 'bg-[#29243B] border-[#29243B] text-white'
                  : 'bg-white/95 border-[#ECEAF0] text-[#777486] hover:text-[#29243B]'
              }`}
            >
              {isCompared ? <Check className="w-3.5 h-3.5" /> : <GitCompare className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div className="p-2.5 sm:p-5 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1.5 text-[11px] sm:text-xs text-[#777486]">
            <Link to={`/shops/${product.shopSlug}`} className="hover:text-[#D93B52] font-medium truncate">
              {product.brandName || product.shopName}
            </Link>
            <span className="inline-flex items-center gap-0.5 tabular-nums text-[#29243B] shrink-0">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#FF6478] text-[#FF6478]" />
              {product.rating.toFixed(1)}
            </span>
          </div>

          <Link to={`/products/${product.id}`} className="block">
            <h3 className="text-[13px] sm:text-base font-semibold text-[#29243B] leading-snug line-clamp-2 hover:text-[#D93B52] transition-colors">
              {title}
            </h3>
          </Link>

          {product.stock <= 10 && product.stock > 0 && (
            <p className="text-[10px] sm:text-[11px] font-medium text-[#D93B52] truncate">
              {lang === 'bn' ? `মাত্র ${product.stock}টি স্টকে` : `Only ${product.stock} left`}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-2 sm:pt-3 border-t border-[#ECEAF0]">
          <div className="min-w-0">
            <span className="text-sm sm:text-lg font-bold text-[#29243B] tabular-nums block leading-tight">
              {formatBdt(product.priceBdt, lang)}
            </span>
            {product.compareAtBdt && product.compareAtBdt > product.priceBdt && (
              <span className="text-[10px] sm:text-xs text-[#777486] line-through tabular-nums block leading-tight">
                {formatBdt(product.compareAtBdt, lang)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              addToCart({
                productId: product.id,
                variant: product.variants[0] || 'Standard',
                quantity: 1,
                affiliateCode,
              })
            }
            aria-label={`${t(lang, 'addToCart')} - ${product.titleEn}`}
            className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#29243B] text-white text-[11px] sm:text-xs font-semibold hover:bg-[#E83F58] transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1 min-h-[36px]"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:hidden" />
            <span className="sm:hidden">{lang === 'bn' ? 'যোগ' : 'Add'}</span>
            <span className="hidden sm:inline">{t(lang, 'addToCart')}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

