/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutShell } from './components/LayoutShell';
import { AppProvider } from './context/AppContext';
import { BabyTrackerPage } from './pages/BabyTrackerPage';
import { CartPage, CheckoutPage, OrdersPage } from './pages/CartCheckoutOrdersPage';
import { CommunityPage } from './pages/CommunityPage';
import { CreatePage } from './pages/CreatePage';
import {
  AdminDashboardPage,
  CreatorDashboardPage,
  DoctorDashboardPage,
  SellerDashboardPage,
} from './pages/DashboardsPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { DoctorsPage } from './pages/DoctorsPage';
import {
  AccountHubPage,
  BrandsDirectoryPage,
  SellerRegisterPage,
  SupportAndPolicyPage,
} from './pages/EcosystemPages';
import { GuidePage } from './pages/GuidePage';
import { HomePage } from './pages/HomePage';
import { MarketplacePage, ProductDetailPage } from './pages/MarketplacePage';
import {
  AuthPage,
  CreatorsAndProfilePage,
  InfoPage,
  MessagesPage,
  NotificationsPage,
  SavedCollectionsPage,
  SearchPage,
  SettingsPage,
  WishlistPage,
} from './pages/SocialHubPages';
import { VideosPage } from './pages/VideosPage';

const ResponsiveHomeEntry = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile ? <VideosPage /> : <HomePage />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <LayoutShell>
            <Routes>
              {/* Mobile opens directly into Video-First Discovery; Desktop opens full Commerce Homepage */}
              <Route path="/" element={<ResponsiveHomeEntry />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/discover" element={<DiscoverPage initialTab="discover" />} />
              <Route path="/following" element={<DiscoverPage initialTab="following" />} />
              <Route path="/trending" element={<DiscoverPage initialTab="trending" />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/questions" element={<CommunityPage />} />

              {/* Bilingual Mother's Guide */}
              <Route path="/guide" element={<GuidePage initialCategory="all" />} />
              <Route path="/pregnancy" element={<GuidePage initialCategory="pregnancy" />} />
              <Route path="/baby-care" element={<GuidePage initialCategory="baby_care" />} />
              <Route path="/mother-care" element={<GuidePage initialCategory="mother_care" />} />
              <Route path="/child-development" element={<GuidePage initialCategory="child_development" />} />

              {/* Doctor Corner & Appointments */}
              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/doctors/:id" element={<DoctorsPage />} />
              <Route path="/appointments" element={<DoctorsPage />} />

              {/* Multi-Vendor Marketplace, Brands & Checkout */}
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/marketplace/categories/:slug" element={<MarketplacePage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/shops/:slug" element={<MarketplacePage />} />
              <Route path="/brands" element={<BrandsDirectoryPage />} />
              <Route path="/brands/:slug" element={<BrandsDirectoryPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />

              {/* Customer Account, Creators, Profiles & Social Hub */}
              <Route path="/account" element={<AccountHubPage />} />
              <Route path="/creators" element={<CreatorsAndProfilePage mode="directory" />} />
              <Route path="/creators/:username" element={<CreatorsAndProfilePage mode="profile" />} />
              <Route path="/profile" element={<CreatorsAndProfilePage mode="profile" />} />
              <Route path="/profile/edit" element={<SettingsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/saved" element={<SavedCollectionsPage />} />
              <Route path="/collections" element={<SavedCollectionsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/search" element={<SearchPage />} />

              {/* Content Creation Studio */}
              <Route path="/create" element={<CreatePage initialType="photo" />} />
              <Route path="/create/photo" element={<CreatePage initialType="photo" />} />
              <Route path="/create/video" element={<CreatePage initialType="short_video" />} />
              <Route path="/create/question" element={<CreatePage initialType="question" />} />
              <Route path="/create/poll" element={<CreatePage initialType="poll" />} />

              {/* Private Baby Growth Tracker */}
              <Route path="/baby-tracker" element={<BabyTrackerPage />} />

              {/* Role Dashboards & Seller Onboarding */}
              <Route path="/seller/register" element={<SellerRegisterPage />} />
              <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
              <Route path="/seller/*" element={<SellerDashboardPage />} />
              <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
              <Route path="/doctor/*" element={<DoctorDashboardPage />} />
              <Route path="/creator/dashboard" element={<CreatorDashboardPage />} />
              <Route path="/creator/*" element={<CreatorDashboardPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/*" element={<AdminDashboardPage />} />

              {/* Support, Shipping, Returns, Auth & Informational Routes */}
              <Route path="/support" element={<SupportAndPolicyPage />} />
              <Route path="/returns" element={<SupportAndPolicyPage />} />
              <Route path="/shipping" element={<SupportAndPolicyPage />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/verify-otp" element={<AuthPage mode="verify" />} />
              <Route path="/forgot-password" element={<AuthPage mode="reset" />} />
              <Route path="/reset-password" element={<AuthPage mode="reset" />} />
              <Route path="/about" element={<InfoPage page="about" />} />
              <Route path="/contact" element={<InfoPage page="contact" />} />
              <Route path="/help" element={<InfoPage page="help" />} />
              <Route path="/privacy" element={<InfoPage page="privacy" />} />
              <Route path="/terms" element={<InfoPage page="terms" />} />
              <Route path="/community-guidelines" element={<InfoPage page="guidelines" />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LayoutShell>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
