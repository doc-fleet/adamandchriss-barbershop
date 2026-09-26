'use client';
// src/components/Header.tsx
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { siteConfig } from '@/config/site';
import LanguageToggle from '@/components/LanguageToggle';

interface Props {
  showBooking?: boolean;
}

export default function Header({ showBooking = true }: Props) {
  const t = useTranslations('navigation');
  const locale = useLocale();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-primary-800">
          {siteConfig.name[locale as 'en' | 'ar']}
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/services" className="text-gray-600 hover:text-primary-600">
            {t('services')}
          </Link>
          {showBooking && (
            <Link href="/book" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full">
              {t('book')}
            </Link>
          )}
          <LanguageToggle />
        </nav>
      </div>
    </header>
  );
}
