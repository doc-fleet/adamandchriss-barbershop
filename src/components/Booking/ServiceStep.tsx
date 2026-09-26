'use client';
// src/components/Booking/ServiceStep.tsx
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n';

interface Service {
  slug: string;
  name_en: string;
  name_ar: string;
  duration_min: number;
  price_egp: number;
  deposit_pct: number;
}

interface Props {
  services: Service[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  onNext: () => void;
  locale: Locale;
}

export default function ServiceStep({ services, selectedSlug, onSelect, onNext, locale }: Props) {
  const t = useTranslations('booking');
  const servicesT = useTranslations('services');
  const commonT = useTranslations('common');

  return (
    <>
      <h2 className="text-xl font-bold text-primary-800 mb-4">{t('selectService')}</h2>
      <div className="space-y-3 mb-6">
        {services.map((s) => (
          <div
            key={s.slug}
            onClick={() => onSelect(s.slug)}
            className={`border-2 rounded-lg p-4 cursor-pointer transition ${
              selectedSlug === s.slug
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-primary-800">
                {locale === 'en' ? s.name_en : s.name_ar}
              </h3>
              <span className="text-lg font-bold text-primary-600">{s.price_egp} EGP</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {s.duration_min} {servicesT('minutes')} · {t('deposit')}: {Math.round(s.price_egp * s.deposit_pct / 100)} EGP
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!selectedSlug}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {commonT('next')}
      </button>
    </>
  );
}
