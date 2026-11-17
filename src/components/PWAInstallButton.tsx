import React, { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { lang } = useApp();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECEAF0] bg-white px-3 py-1.5 text-xs font-semibold text-[#29243B] hover:border-[#B8A5F5] hover:bg-[#F3F0FE]/60 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-[#E83F58]" />
        {t(lang, 'installApp')}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#ECEAF0] bg-white px-3 py-1.5 text-xs font-semibold text-[#29243B] hover:border-[#B8A5F5] hover:bg-[#F3F0FE]/60 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-[#E83F58]" />
          {t(lang, 'installApp')}
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29243B]/55 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-3 border border-[#ECEAF0] shadow-xl">
              <h3 className="text-base font-bold text-[#29243B]">Install Aloorai</h3>
              <p className="text-sm text-[#777486] leading-relaxed">
                Tap the Share icon in Safari and select Add to Home Screen for app-like access.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-2xl bg-[#29243B] py-2.5 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { lang } = useApp();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl bg-[#29243B] px-3.5 py-2 text-xs font-medium text-white shadow-lg border border-white/10"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#FF6478]" />
      <span>
        {lang === 'bn'
          ? 'অফলাইন মোড — সংরক্ষিত তথ্য দেখানো হচ্ছে'
          : 'Offline Mode — Cached content active'}
      </span>
    </div>
  );
};
