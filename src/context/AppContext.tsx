import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, type User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../lib/firebase';
import type { CartItem, Language, NotificationItem, UserRole } from '../types/platform';

interface AppContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  firebaseUser: User | null;
  authReady: boolean;
  viewerId: string;
  viewerName: string;
  activeRoles: UserRole[];
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateCartQty: (productId: string, variant: string, delta: number) => void;
  removeFromCart: (productId: string, variant: string) => void;
  clearCart: () => void;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => void;
  notifications: NotificationItem[];
  unreadNotifications: number;
  refreshNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
  apiFetch: <T>(url: string, init?: RequestInit) => Promise<T>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('mc_lang');
    return saved === 'en' ? 'en' : 'bn';
  });
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('mc_cart');
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('mc_wishlist');
      return raw ? (JSON.parse(raw) as string[]) : ['prod_1'];
    } catch {
      return ['prod_1'];
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem('mc_lang', next);
    document.documentElement.lang = next;
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'bn' ? 'en' : 'bn');
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('mc_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('mc_wishlist', JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  useEffect(() => {
    testConnection();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user && user.emailVerified) {
        const cleanUsername = (user.email?.split('@')[0] || 'mother_user').replace(/[^a-zA-Z0-9_.]/g, '_').slice(0, 32);
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              uid: user.uid,
              displayName: user.displayName || 'Aloorai Member',
              username: cleanUsername,
              bio: 'Aloorai Bangladesh member',
              avatarUrl: user.photoURL || '',
              isPrivate: false,
              followersCount: 0,
              followingCount: 0,
              likesCount: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          await setDoc(
            doc(db, 'users', user.uid, 'private', 'info'),
            {
              uid: user.uid,
              email: user.email || '',
              preferredLang: lang,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          // Only log structured permission diagnostics if Firestore sync hits a rule boundary
          try {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
          } catch {
            // Keep app interactive even if initial profile sync fails
          }
        }
      }
    });
    return () => unsub();
  }, [lang]);

  const viewerId = firebaseUser?.uid || 'guest_demo';
  const viewerName = firebaseUser?.displayName || 'আয়েশা আক্তার (Demo Mother)';
  const activeRoles: UserRole[] = ['registered', 'mother_parent', 'creator', 'seller', 'doctor', 'admin'];

  const apiFetch = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const headers = new Headers(init?.headers || {});
      headers.set('x-viewer-id', viewerId);
      if (init?.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(url, { ...init, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return data as T;
    },
    [viewerId]
  );

  const refreshNotifications = useCallback(async () => {
    try {
      const items = await apiFetch<NotificationItem[]>('/api/v1/notifications');
      setNotifications(items);
    } catch {
      // Ignore transient load failures
    }
  }, [apiFetch]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const markAllNotificationsRead = useCallback(async () => {
    await apiFetch('/api/v1/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, [apiFetch]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      showToast(lang === 'bn' ? 'সফলভাবে সাইন ইন সম্পন্ন হয়েছে' : 'Signed in successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in cancelled';
      showToast(message);
    }
  }, [lang, showToast]);

  const signOutUser = useCallback(async () => {
    await fbSignOut(auth);
    showToast(lang === 'bn' ? 'সাইন আউট করা হয়েছে' : 'Signed out');
  }, [lang, showToast]);

  const addToCart = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const idx = prev.findIndex((c) => c.productId === item.productId && c.variant === item.variant);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
          return next;
        }
        return [...prev, item];
      });
      showToast(lang === 'bn' ? 'শপিং ব্যাগে যোগ করা হয়েছে' : 'Added to shopping bag');
    },
    [lang, showToast]
  );

  const updateCartQty = useCallback((productId: string, variant: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.productId === productId && c.variant === variant ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string, variant: string) => {
    setCart((prev) => prev.filter((c) => !(c.productId === productId && c.variant === variant)));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        firebaseUser,
        authReady,
        viewerId,
        viewerName,
        activeRoles,
        signInWithGoogle,
        signOutUser,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        notifications,
        unreadNotifications,
        refreshNotifications,
        markAllNotificationsRead,
        toast,
        showToast,
        apiFetch,
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[132px] lg:bottom-24 right-4 lg:right-6 z-50 bg-[#29243B] text-white text-sm font-medium px-4 py-2.5 rounded-2xl shadow-lg border border-white/10 max-w-xs"
        >
          {toast}
        </div>
      )}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
