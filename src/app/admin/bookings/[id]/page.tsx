// src/app/admin/bookings/[id]/page.tsx
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import Link from 'next/link';

const STATUS_LABELS: Record<string, Record<string, string>> = {
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

const STATUS_CLASS: Record<string, string> = {
  PENDING_DEPOSIT: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-600',
};

const PAYMENT_STATUS_LABELS: Record<string, Record<string, string>> = {
  en: {
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
  },
  ar: {
    PENDING: 'معلق',
    PAID: 'مدفوع',
    FAILED: 'فاشل',
    REFUNDED: 'مسترد',
  },
};

export default async function AdminBookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ar';

  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(params.id, 10) },
    include: {
      client: true,
      service: true,
      barber: true,
      payments: true,
    },
  });

  if (!booking) notFound();

  const total = booking.depositAmount + booking.balanceAmount;
  const paid = booking.payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);
  const balance = total - paid;

  const barbers = await prisma.barber.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  const statusLabel =
    STATUS_LABELS[locale]?.[booking.status] ?? booking.status;
  const statusClass =
    STATUS_CLASS[booking.status] ?? 'bg-gray-100 text-gray-800';

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4"
      >
        &larr; {locale === 'en' ? 'Back to Bookings' : 'رجوع إلى الحجوزات'}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">
            {locale === 'en' ? 'Booking Details' : 'تفاصيل الحجز'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {locale === 'en' ? 'Code' : 'الكود'}:{' '}
            <span className="font-mono font-medium text-primary-700">{booking.code}</span>
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: client + service + barber */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-primary-800 mb-4">
              {locale === 'en' ? 'Client' : 'العميل'}
            </h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">{locale === 'en' ? 'Name' : 'الاسم'}</dt>
              <dd className="font-medium">{booking.client?.name || '—'}</dd>
              <dt className="text-gray-500">{locale === 'en' ? 'Phone' : 'الهاتف'}</dt>
              <dd className="text-right">
                {booking.client?.phone || booking.client?.whatsapp || '—'}
              </dd>
              <dt className="text-gray-500">{locale === 'en' ? 'Email' : 'البريد'}</dt>
              <dd className="text-right">{booking.client?.email || '—'}</dd>
              <dt className="text-gray-500">{locale === 'en' ? 'Language' : 'اللغة'}</dt>
              <dd className="text-right">
                {booking.client?.language === 'ar' ? 'العربية' : 'English'}
              </dd>
              {booking.client?.hotel && (
                <>
                  <dt className="text-gray-500">{locale === 'en' ? 'Hotel' : 'الفندق'}</dt>
                  <dd className="text-right">{booking.client.hotel}</dd>
                </>
              )}
              {booking.client?.notes && (
                <>
                  <dt className="text-gray-500">{locale === 'en' ? 'Notes' : 'ملاحظات'}</dt>
                  <dd className="text-right col-span-2 text-gray-600 italic">
                    {booking.client.notes}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* Service card */}
          {booking.service && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-primary-800 mb-4">
                {locale === 'en' ? 'Service' : 'الخدمة'}
              </h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-gray-500">{locale === 'en' ? 'Name' : 'الاسم'}</dt>
                <dd className="font-medium">
                  {locale === 'en'
                    ? booking.service.nameEn
                    : booking.service.nameAr}
                </dd>
                <dt className="text-gray-500">{locale === 'en' ? 'Duration' : 'المدة'}</dt>
                <dd className="text-right">
                  {booking.service.durationMin} {locale === 'en' ? 'min' : 'دقيقة'}
                </dd>
                <dt className="text-gray-500">{locale === 'en' ? 'Price' : 'السعر'}</dt>
                <dd className="text-right font-medium">
                  {formatCurrency(booking.service.priceEgp, locale)}
                </dd>
                <dt className="text-gray-500">{locale === 'en' ? 'Deposit %' : 'نسبة الإيداع'}</dt>
                <dd className="text-right">{booking.service.depositPct}%</dd>
              </dl>
            </div>
          )}

          {/* Barber card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-primary-800 mb-4">
              {locale === 'en' ? 'Barber' : 'الحلاق'}
            </h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">{locale === 'en' ? 'Name' : 'الاسم'}</dt>
              <dd className="font-medium">{booking.barber?.name || '—'}</dd>
              <dt className="text-gray-500">{locale === 'en' ? 'Phone' : 'الهاتف'}</dt>
              <dd className="text-right">{booking.barber?.phone || '—'}</dd>
              {booking.barber?.languages && (
                <>
                  <dt className="text-gray-500">{locale === 'en' ? 'Languages' : 'اللغات'}</dt>
                  <dd className="text-right">{booking.barber.languages}</dd>
                </>
              )}
            </dl>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-primary-800 mb-2">
                {locale === 'en' ? 'Notes' : 'ملاحظات'}
              </h2>
              <p className="text-gray-600 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Right column: datetime, location, payment, actions */}
        <div className="space-y-6">
          {/* DateTime card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-primary-800 mb-4">
              {locale === 'en' ? 'Date & Time' : 'التاريخ والوقت'}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {locale === 'en' ? 'Date' : 'التاريخ'}:
                </span>
                <span className="font-medium">
                  {booking.startAt.toLocaleDateString(locale, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {locale === 'en' ? 'Time' : 'الوقت'}:
                </span>
                <span className="font-medium">
                  {booking.startAt.toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {locale === 'en' ? 'End' : 'ينتهي'}:
                </span>
                <span className="font-medium">
                  {booking.endAt.toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {locale === 'en' ? 'Created' : 'تاريخ الإنشاء'}:
                </span>
                <span className="text-gray-600">
                  {booking.createdAt.toLocaleString(locale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Location card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-primary-800 mb-4">
              {locale === 'en' ? 'Location' : 'الموقع'}
            </h2>
            <p className="text-primary-700 font-medium">{booking.locationText}</p>
            {booking.area && (
              <p className="text-sm text-gray-500 mt-1">{booking.area}</p>
            )}
          </div>

          {/* Payment card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-primary-800 mb-4">
              {locale === 'en' ? 'Payment' : 'الدفع'}
            </h2>
            <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
              <dt className="text-gray-500">
                {locale === 'en' ? 'Deposit' : 'الإيداع'}:
              </dt>
              <dd className="font-medium">
                {formatCurrency(booking.depositAmount, locale)}
              </dd>
              <dt className="text-gray-500">
                {locale === 'en' ? 'Balance' : 'الباقي'}:
              </dt>
              <dd className="font-medium">
                {formatCurrency(booking.balanceAmount, locale)}
              </dd>
              <dt className="text-gray-500">
                {locale === 'en' ? 'Total' : 'المجموع'}:
              </dt>
              <dd className="font-semibold text-primary-800 border-t border-gray-200 pt-2">
                {formatCurrency(total, locale)}
              </dd>
              <dt className="text-gray-500">
                {locale === 'en' ? 'Paid' : 'تم الدفع'}:
              </dt>
              <dd className="font-medium">
                {formatCurrency(paid, locale)}
              </dd>
              <dt className="text-gray-500">
                {locale === 'en' ? 'Remaining' : 'الباقي'}:
              </dt>
              <dd className="font-medium text-amber-600">
                {formatCurrency(balance, locale)}
              </dd>
            </dl>

            {/* Payment methods list */}
            {booking.payments.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-500 mb-2">
                  {locale === 'en' ? 'Payment History' : 'سجل المدفوعات'}:
                </p>
                <div className="space-y-1">
                  {booking.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-xs py-1 border-b last:border-0"
                    >
                      <span className="text-gray-600">
                        {locale === 'en' ? 'Method' : 'الطريقة'}: {p.method}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(p.amount, locale)} —{' '}
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            p.status === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : p.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : p.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[locale]?.[
                            p.status
                          ] ?? p.status}
                        </span>
                        {p.paymobRef && (
                          <span className="ml-2 text-gray-400 font-mono">
                            #{p.paymobRef}
                          </span>
                        )}
                        {p.recordedBy && (
                          <span className="ml-2 text-gray-400">
                            ({locale === 'en' ? 'by' : 'بواسطة'} {p.recordedBy})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-primary-800 mb-4">
              {locale === 'en' ? 'Actions' : 'الإجراءات'}
            </h2>

            <div className="space-y-3">
              {/* Confirm button */}
              {booking.status !== 'CONFIRMED' &&
                booking.status !== 'COMPLETED' &&
                booking.status !== 'CANCELLED' && (
                  <form
                    action={async () => {
                      'use server';
                      await prisma.booking.update({
                        where: { id: booking.id },
                        data: { status: 'CONFIRMED' },
                      });
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition touch-target-sm"
                    >
                      {locale === 'en' ? 'Confirm Booking' : 'تأكيد الحجز'}
                    </button>
                  </form>
                )}

              {/* Cancel button */}
              {booking.status !== 'CANCELLED' &&
                booking.status !== 'COMPLETED' && (
                  <form
                    action={async () => {
                      'use server';
                      await prisma.booking.update({
                        where: { id: booking.id },
                        data: { status: 'CANCELLED' },
                      });
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg text-sm transition touch-target-sm"
                    >
                      {locale === 'en' ? 'Cancel Booking' : 'إلغاء الحجز'}
                    </button>
                  </form>
                )}

              {/* Reassign barber */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-3">
                  {locale === 'en' ? 'Reassign Barber' : 'إعادة تعيين الحلاق'}
                </p>
                <form action={async (formData: FormData) => {
                  'use server';
                  const barberId = parseInt(formData.get('barberId') as string, 10);
                  if (barberId) {
                    await prisma.booking.update({
                      where: { id: booking.id },
                      data: { barberId },
                    });
                  }
                }}>
                  <select
                    name="barberId"
                    defaultValue={booking.barberId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white mb-2"
                    required
                  >
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm transition"
                  >
                    {locale === 'en' ? 'Reassign' : 'إعادة التعيين'}
                  </button>
                </form>
              </div>

              {/* Paymob link */}
              {booking.status === 'PENDING_DEPOSIT' && (
                <p className="text-xs text-gray-400 text-center pt-2">
                  {locale === 'en'
                    ? 'Deposit required before confirmation'
                    : 'يُشترط الدeposit قبل التأكيد'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
