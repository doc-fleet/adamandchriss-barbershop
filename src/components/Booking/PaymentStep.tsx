'use client';
// src/components/Booking/PaymentStep.tsx
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { defaultServices } from '@/config/site';
import type { Locale } from '@/i18n';
import { generateBookingCode } from '@/lib/utils';

interface Service {
  slug: string;
  name_en: string;
  name_ar: string;
  duration_min: number;
  price_egp: number;
  deposit_pct: number;
}

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
  service: Service;
  bookingData: BookingData;
  onBookingCreated: (id: string) => void;
  locale: Locale;
}

export default function PaymentStep({ service, bookingData, onBookingCreated, locale }: Props) {
  const t = useTranslations('booking');
  const paymobT = useTranslations('paymob');
  const commonT = useTranslations('common');

  const [isCreating, setIsCreating] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const depositAmount = Math.round(service.price_egp * service.deposit_pct / 100);

  const handlePay = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceSlug: bookingData.serviceSlug,
          date: bookingData.date,
          time: bookingData.time,
          name: bookingData.name,
          whatsapp: bookingData.whatsapp,
          email: bookingData.email,
          location: bookingData.location,
          locale,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      onBookingCreated(result.bookingId);
      setPaymentUrl(result.paymobUrl);
      // In test mode, show Paymob iframe
      if (result.paymobUrl) {
        window.location.href = result.paymobUrl;
      } else {
        // Fallback: show confirmation directly (test mode without real Paymob)
        setPaymentUrl('#success');
      }
    } catch (err: any) {
      setError(err.message);
      setIsCreating(false);
    }
  };

  // If paymentUrl is set to '#success', show confirmation
  if (paymentUrl === '#success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="butt" strokeLinejoin="miter" strokeWidth={2} stroke="currentColor" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-primary-800 mb-4">{t('confirmation')}</h2>
        <p className="text-gray-600 mb-6">
          {locale === 'en'
            ? 'Your booking is confirmed! A confirmation has been sent to your WhatsApp.'
            : 'تم تأكيد حجزك! تم إرسال التأكيد إلى واتسابك.'}
        </p>
        <a
          href={`https://wa.me/201000000000`}
          className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-full transition"
        >
          {locale === 'en' ? 'View Booking' : 'عرض الحجز'}
        </a>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-primary-800 mb-4">{t('payment')}</h2>

      {/* Booking summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">
            {locale === 'en' ? service.name_en : service.name_ar}
          </span>
          <span>{service.price_egp} EGP</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">{t('deposit')}</span>
          <span className="font-bold text-primary-600">{depositAmount} EGP</span>
        </div>
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between">
            <span className="font-medium">Balance on-site</span>
            <span>{service.price_egp - depositAmount} EGP</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={isCreating}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-4 rounded-full text-lg transition flex items-center justify-center gap-3 disabled:opacity-75"
      >
        {isCreating ? (
          <>
            <span className="spinner w-5 h-5"></span>
            {paymobT('processing')}
          </>
        ) : (
          `Pay ${depositAmount} EGP Deposit`
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        {locale === 'en'
          ? 'Secure payment via Paymob. Cancel anytime 24+ hours before your booking.'
          : 'دفع آمن عبر بايموب. إلغاء الحجز في أي وقت قبل 24 ساعة منه.'}
      </p>
    </>
  );
}
