'use client';
// src/components/Header.tsx
import { useState } from 'react';
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 touch-target"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>

          <Link href="/" className="text-xl font-bold text-primary-800">
            {siteConfig.name[locale as 'en' | 'ar']}
          </Link>

          <nav className="hidden lg:flex items-center gap-4">
            <Link href="/services" className="text-gray-600 hover:text-primary-600">
              {t('services')}
            </Link>
            {showBooking && (
              <>
                <Link href="/bookings" className="text-gray-600 hover:text-primary-600">
                  {t('myBookings')}
                </Link>
                <Link href="/book" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full touch-target">
                  {t('book')}
                </Link>
              </>
            )}
            <LanguageToggle />
          </nav>

          {/* Mobile menu dropdown */}
          {mobileOpen && (
            <nav className="lg:hidden mt-3 pb-3 border-t pt-3 space-y-2">
              <Link
                href="/services"
                className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 touch-target"
                onClick={() => setMobileOpen(false)}
              >
                {t('services')}
              </Link>
              {showBooking && (
                <>
                  <Link
                    href="/bookings"
                    className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 touch-target"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('myBookings')}
                  </Link>
                  <Link
                    href="/book"
                    className="block px-3 py-2.5 rounded-lg bg-primary-600 text-white text-center touch-target"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('book')}
                  </Link>
                </>
              )}
              <div className="pt-2 border-t">
                <LanguageToggle />
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
