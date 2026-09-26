'use client';
// src/app/page.tsx
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { siteConfig, defaultServices } from '@/config/site';
import Header from '@/components/Header';
import LanguageToggle from '@/components/LanguageToggle';

export default function HomePage() {
  const t = useTranslations('homepage');
  const servicesT = useTranslations('services');
  const locale = useLocale();
  const loc = locale as 'en' | 'ar';

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Language toggle in top right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      <Header showBooking={true} />

      <main className="container mx-auto px-4 py-8 md:py-16">
        {/* Hero */}
        <div className="text-center py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-800 mb-4">
            {siteConfig.name[loc]}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {t('hero')}
          </p>
          <p className="text-gray-500 mb-8">
            {t('sub')}
          </p>
          <Link
            href="/book"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-8 rounded-full transition"
          >
            {t('cta')}
          </Link>
        </div>

        {/* Services preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto">
          {defaultServices.map((service) => (
            <div key={service.slug} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-primary-800">
                    {locale === 'en' ? service.name_en : service.name_ar}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {service.duration_min} {servicesT('minutes')} · {service.price_egp} EGP
                  </p>
                </div>
                <Link
                  href={`/services/${service.slug}`}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  {servicesT('viewDetails')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
