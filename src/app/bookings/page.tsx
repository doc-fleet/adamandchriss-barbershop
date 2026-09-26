'use client';
// src/app/bookings/page.tsx
import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

const STATUS_LABELS = {
  en: {
    PENDING_DEPOSIT: 'Pending Deposit',
    CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
  },
  ar: {
    PENDING_DEPOSIT: 'في انتظار الإيداع',
    CONFIRMED: 'مؤكد',
    IN_PROGRESS: 'جارٍ الإنجاز',
    COMPLETED: 'مكتمل',
    CANCELLED: 'ملغي',
    NO_SHOW: 'لم يأتِ',
  },
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING_DEPOSIT: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-500',
};

export default function CustomerBookingsPage() {
  const t = useTranslations('bookings');
  const tNav = useTranslations('navigation');
  const locale = useLocale() as 'en' | 'ar';
  const [isPending, startTransition] = useTransition();
  const [whatsapp, setWhatsapp] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.trim()) {
      setError(t('enterNumber'));
      return;
    }
    setError('');
    setSuccess('');

    const cleaned = whatsapp.trim().replace(/[^\d+]/g, '');
    startTransition(async () => {
      try {
        const res = await fetch('/api/bookings/customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp: cleaned }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t('notFound'));
          setBookings([]);
          setClientName('');
          return;
        }
        setBookings(data.bookings || []);
        setClientName(data.clientName || '');
      } catch {
        setError(t('networkError'));
      }
    });
  };

  const handleCancelRequest = (bookingId: number) => {
    if (!confirm(t('cancelConfirm'))) return;
    setError('');

    startTransition(async () => {
      try {
        const res = await fetch('/api/bookings/cancel-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t('cancelFailed'));
          return;
        }
        setSuccess(t('cancelSent'));
        const cleaned = whatsapp.replace(/[^\d+]/g, '');
        const res2 = await fetch('/api/bookings/customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp: cleaned }),
        });
        const data2 = await res2.json();
        if (res2.ok) {
          setBookings(data2.bookings || []);
        }
      } catch {
        setError(t('networkError'));
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-primary-800">
            Adam & Chriss
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/services" className="text-gray-600 hover:text-primary-600">
              {tNav('services')}
            </Link>
            <Link
              href="/book"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full text-sm"
            >
              {tNav('book')}
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-primary-800 mb-2">
          {t('title')}
        </h1>
        <p className="text-gray-600 mb-6">{t('subtitle')}</p>

        <form
          onSubmit={handleLookup}
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('lookupLabel')}
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+20 100 000 0000"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isPending}
            />
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? t('searching') : t('lookupButton')}
            </button>
          </div>
          {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}
        </form>

        {clientName && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 mb-6 flex justify-between items-center">
            <span className="text-primary-800 font-medium">
              {locale === 'en' ? 'Welcome,' : 'مرحباً,'} {clientName}
            </span>
            <span className="text-primary-600 text-sm">
              {locale === 'en' ? 'Your bookings below' : 'حجوزاتك أدناه'}
            </span>
          </div>
        )}

        {bookings.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {t('myBookings')}
            </h2>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow border border-gray-200 p-5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-gray-500">
                        {locale === 'en' ? 'Booking Code' : 'كود الحجز'}: AC-{booking.code}
                      </span>
                      <h3 className="text-lg font-semibold text-primary-800 mt-1">
                        {locale === 'en' ? booking.service?.nameEn : booking.service?.nameAr || 'Service'}
                      </h3>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-medium ${
                        STATUS_CLASSES[booking.status as keyof typeof STATUS_CLASSES] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {STATUS_LABELS[locale][booking.status as keyof typeof STATUS_LABELS['en']] || booking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">
                        {locale === 'en' ? 'Date & Time' : 'التاريخ والوقت'}
                      </span>
                      <p className="font-medium text-gray-800">
                        {new Date(booking.startAt).toLocaleString(locale, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">
                        {locale === 'en' ? 'Location' : 'الموقع'}
                      </span>
                      <p className="font-medium text-gray-800">
                        {booking.locationText}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">
                        {locale === 'en' ? 'Deposited' : 'المدفوع'}
                      </span>
                      <p className="font-medium text-gray-800">
                        EGP {booking.depositAmount}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">
                        {locale === 'en' ? 'Remaining' : 'المتبقي'}
                      </span>
                      <p className="font-medium text-gray-800">
                        EGP {booking.balanceAmount}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                    <span className="text-sm text-gray-600">
                      {locale === 'en'
                        ? `Total: EGP ${booking.depositAmount + booking.balanceAmount}`
                        : `المجموع: EGP ${booking.depositAmount + booking.balanceAmount}`}
                    </span>
                    {booking.status === 'PENDING_DEPOSIT' || booking.status === 'CONFIRMED' ? (
                      <button
                        onClick={() => handleCancelRequest(booking.id)}
                        className="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 font-medium disabled:opacity-50"
                        disabled={isPending}
                      >
                        {t('cancelButton')}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {locale === 'en' ? 'Cancellation not available' : 'غير قابل للإلغاء'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : bookings.length === 0 && clientName ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t('noBookings')}</p>
          </div>
        ) : clientName ? (
          <div />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('enterNumberFirst')}</p>
          </div>
        )}

        {success && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-center">
            {success}
          </div>
        )}
      </main>
    </div>
  );
}
