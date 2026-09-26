'use client';
// src/components/Booking/DetailsStep.tsx
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n';

type BookingData = {
  serviceSlug: string | null;
  date: string | null;
  time: string | null;
  name: string;
  whatsapp: string;
  email: string;
  location: string;
};

interface Props {
  data: BookingData;
  updateData: (partial: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
  locale: Locale;
}

export default function DetailsStep({ data, updateData, onNext, onBack, locale }: Props) {
  const t = useTranslations('booking');
  const commonT = useTranslations('common');

  const isFormValid = data.name.trim().length > 0 &&
    data.whatsapp.trim().length > 0 &&
    data.location.trim().length > 0;

  return (
    <>
      <h2 className="text-xl font-bold text-primary-800 mb-4">{t('details')}</h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">{t('name')}</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder={locale === 'en' ? 'John Smith' : 'محمد أحمد'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('whatsapp')}</label>
          <div className="flex">
            <span className="px-3 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600">
              +{locale === 'en' ? '20' : '20'}
            </span>
            <input
              type="tel"
              value={data.whatsapp}
              onChange={(e) => updateData({ whatsapp: e.target.value })}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={locale === 'en' ? '10 1234 5678' : '10 1234 5678'}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('email')}</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => updateData({ email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder={locale === 'en' ? 'you@example.com' : 'أنت@مثال.com'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('location')}</label>
          <input
            type="text"
            value={data.location}
            onChange={(e) => updateData({ location: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder={locale === 'en' ? 'Hotel Marriott, Zamalek' : 'فندق الماريوت، الزمالك'}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-full hover:bg-gray-100 transition"
        >
          {commonT('back')}
        </button>
        <button
          onClick={onNext}
          disabled={!isFormValid}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {commonT('next')}
        </button>
      </div>
    </>
  );
}
