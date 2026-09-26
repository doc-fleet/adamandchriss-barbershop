// src/app/admin/bookings/page.tsx
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; date?: string };
}) {
  const cookieStore = cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ar';
  const statusFilter = searchParams.status;

  const where: any = {};
  if (statusFilter && statusFilter !== 'all') {
    where.status = statusFilter;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      client: true,
      service: true,
      barber: true,
      payments: true,
    },
    orderBy: { startAt: 'desc' },
  });

  const statuses = ['PENDING_DEPOSIT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  const statusLabels: Record<string, Record<string, string>> = {
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-800 mb-6">
        {locale === 'en' ? 'All Bookings' : 'جميع الحجوزات'}
      </h2>

      {/* Filters */}
      <div className="mb-4 flex gap-4 flex-wrap">
      <form method="GET" className="flex gap-2 items-center flex-wrap">
        <select
          name="status"
          defaultValue={statusFilter || 'all'}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm touch-target-sm min-w-[140px]"
        >
            <option value="all">{locale === 'en' ? 'All Statuses' : 'جميع الحالات'}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[locale][s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 bg-primary-600 text-white text-sm rounded-lg touch-target-sm"
          >
            {locale === 'en' ? 'Apply' : 'تطبيق'}
          </button>
          <a
            href="/admin/bookings"
            className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600"
          >
            {locale === 'en' ? 'Clear' : 'مسح'}
          </a>
        </form>
      </div>

      {/* Bookings table */}
      {bookings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Code' : 'الكود'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Client' : 'العميل'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Service' : 'الخدمة'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Date & Time' : 'التاريخ والوقت'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Location' : 'الموقع'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Status' : 'الحالة'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Total' : 'المجموع'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Actions' : 'الإجراءات'}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{booking.code}</td>
                  <td className="py-2 px-3">{booking.client?.name || '—'}</td>
                  <td className="py-2 px-3">
                    {locale === 'en' ? booking.service?.nameEn : booking.service?.nameAr || '—'}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    {booking.startAt.toLocaleString(locale, {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 px-3 text-sm">{booking.locationText}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                      booking.status === 'PENDING_DEPOSIT' ? 'bg-amber-100 text-amber-800' :
                      booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {statusLabels[locale][booking.status] || booking.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {formatCurrency(booking.depositAmount + booking.balanceAmount, locale)}
                  </td>
                  <td className="py-2 px-3">
                    <a
                      href={`/admin/bookings/${booking.id}`}
                      className="text-primary-600 hover:text-primary-800 text-sm"
                    >
                      {locale === 'en' ? 'View' : 'عرض'}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-12">
          {locale === 'en' ? 'No bookings found' : 'لا توجد حجوزات'}
        </p>
      )}
    </div>
  );
}
