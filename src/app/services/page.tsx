'use client';
// src/app/services/page.tsx
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { siteConfig, defaultServices } from '@/config/site';
import Header from '@/components/Header';
import LanguageToggle from '@/components/LanguageToggle';

export default function ServicesPage() {
  const t = useTranslations('services');
  const nav = useTranslations('navigation');
  const locale = useLocale();
  const loc = locale as 'en' | 'ar';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>
      <Header />

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center text-primary-800 mb-8">
          {t('title')}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {defaultServices.map((service) => (
            <div key={service.slug} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-primary-800 mb-2">
                  {locale === 'en' ? service.name_en : service.name_ar}
                </h3>
                <p className="text-gray-600 mb-4">
                  {locale === 'en' ? service.description_en : service.description_ar}
                </p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">
                    {service.duration_min} {t('minutes')} · {service.price_egp} EGP
                  </span>
                  <span className="text-lg font-bold text-primary-600">
                    {service.price_egp} EGP
                  </span>
                </div>
                <div className="mb-4 text-sm">
                  <strong>{t('deposit')}:</strong> {Math.round(service.price_egp * service.deposit_pct / 100)} EGP ({service.deposit_pct}%)
                </div>
                <Link
                  href={`/services/${service.slug}`}
                  className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 rounded-full transition"
                >
                  {t('bookNow')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
