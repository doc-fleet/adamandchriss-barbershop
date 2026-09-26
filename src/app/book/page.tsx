'use client';
// src/app/book/page.tsx
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { defaultServices } from '@/config/site';
import Header from '@/components/Header';
import LanguageToggle from '@/components/LanguageToggle';
import ServiceStep from '@/components/Booking/ServiceStep';
import TimeStep from '@/components/Booking/TimeStep';
import DetailsStep from '@/components/Booking/DetailsStep';
import PaymentStep from '@/components/Booking/PaymentStep';

type BookingData = {
  serviceSlug: string | null;
  date: string | null;
  time: string | null;
  name: string;
  whatsapp: string;
  email: string;
  location: string;
};

const STEPS = ['service', 'time', 'details', 'payment'] as const;

export default function BookPage() {
  const t = useTranslations('booking');
  const nav = useTranslations('navigation');
  const locale = useLocale();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<BookingData>({
    serviceSlug: null,
    date: null,
    time: null,
    name: '',
    whatsapp: '',
    email: '',
    location: '',
  });
  const [bookingId, setBookingId] = useState<string | null>(null);

  const updateData = (partial: Partial<BookingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const service = data.serviceSlug ? defaultServices.find((s) => s.slug === data.serviceSlug) : null;

  if (bookingId) {
    // Show confirmation
    const deposit = service ? Math.round(service.price_egp * service.deposit_pct / 100) : 0;
    return (
      <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="butt" strokeLinejoin="miter" strokeWidth={2} stroke="currentColor" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-primary-800 mb-4">{t('confirmation')}</h2>
            <p className="text-gray-600 mb-6">
              {locale === 'en'
                ? `Booking ${bookingId} confirmed! A WhatsApp confirmation has been sent.`
                : `تم تأكيد الحجز ${bookingId}! تم إرسال التأكيد عبر الواتساب.`}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="font-medium mb-1">{locale === 'en' ? service?.name_en : service?.name_ar}</p>
              <p className="text-sm text-gray-600">{data.date} at {data.time}</p>
              <p className="text-sm text-gray-600">{data.location}</p>
              <p className="text-sm font-medium text-primary-600 mt-2">Deposit paid: {deposit} EGP</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress bar */}
        <div className="flex flex-wrap gap-y-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i === step
                    ? 'bg-primary-600 text-white'
                    : i < step
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {i + 1}
              </div>
              <span className="ml-2 text-sm font-medium">
                {t(`step.${s}`)}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-1 bg-gray-200 mx-2"></div>}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
          {step === 0 && (
            <ServiceStep
              services={defaultServices}
              selectedSlug={data.serviceSlug}
              onSelect={(slug) => updateData({ serviceSlug: slug })}
              onNext={nextStep}
              locale={locale as any}
            />
          )}

          {step === 1 && service && (
            <TimeStep
              service={service}
              selectedDate={data.date}
              selectedTime={data.time}
              onSelectDate={(date) => updateData({ date })}
              onSelectTime={(time) => updateData({ time })}
              onNext={nextStep}
              onBack={prevStep}
              locale={locale as any}
            />
          )}

          {step === 2 && service && (
            <DetailsStep
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onBack={prevStep}
              locale={locale as any}
            />
          )}

          {step === 3 && service && (
            <PaymentStep
              service={service}
              bookingData={data}
              onBookingCreated={setBookingId}
              locale={locale as any}
            />
          )}
        </div>
      </main>
    </div>
  );
}
