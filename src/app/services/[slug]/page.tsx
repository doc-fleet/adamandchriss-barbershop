'use client';
// src/app/services/[slug]/page.tsx
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { defaultServices } from '@/config/site';
import Header from '@/components/Header';
import LanguageToggle from '@/components/LanguageToggle';

export default function ServiceDetailPage() {
  const t = useTranslations('services');
  const locale = useLocale();
  const params = useParams();
  const slug = params?.slug as string;

  const service = defaultServices.find((s) => s.slug === slug);
  if (!service) {
    return <div className="container mx-auto py-12">Service not found</div>;
  }

  const depositAmount = Math.round(service.price_egp * service.deposit_pct / 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="h-64 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">Service Image</span>
          </div>
          <div className="p-8">
            <h2 className="text-3xl font-bold text-primary-800 mb-4">
              {locale === 'en' ? service.name_en : service.name_ar}
            </h2>
            <p className="text-gray-600 mb-6">
              {locale === 'en' ? service.description_en : service.description_ar}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">{service.duration_min}</div>
                <div className="text-sm text-gray-600">{t('duration')}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">{service.price_egp} EGP</div>
                <div className="text-sm text-gray-600">{t('price')}</div>
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <p><strong>{t('deposit')}:</strong> {depositAmount} EGP ({service.deposit_pct}%)</p>
              <p className="text-sm text-gray-500 mt-1">
                {locale === 'en'
                  ? 'Deposit is deducted from the total. Balance paid on-site via QR or cash.'
                  : 'يتم خصم المقدار المئت من الإجمالي. يتم دفع الرصيد المتبقي على موقعك عبر QR أو نقداً.'}
              </p>
            </div>

            <Link
              href="/book"
              className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-full transition"
            >
              {t('bookNow')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
