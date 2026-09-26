// src/components/LanguageToggle.tsx
'use client';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n';

export default function LanguageToggle() {
  const locale = useLocale();
  const otherLocale = locale === 'en' ? 'ar' : 'en';
  const otherLabel = locale === 'en' ? 'العربية' : 'English';

  function switchLocale() {
    // Set cookie and reload to preserve server-side locale detection
    document.cookie = `NEXT_LOCALE=${otherLocale}; path=/; max-age=31536000`;
    window.location.reload();
  }

  return (
    <button
      onClick={switchLocale}
      className="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 transition"
    >
      {otherLabel}
    </button>
  );
}
