// src/app/admin/page.tsx
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ar';

  const [bookingCount, serviceCount, revenueTotal] = await Promise.all([
    prisma.booking.count(),
    prisma.service.count(),
    prisma.booking.aggregate({
      _sum: { depositAmount: true, balanceAmount: true },
    }),
  ]);

  const totalRevenue = (revenueTotal._sum.depositAmount || 0) + (revenueTotal._sum.balanceAmount || 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-800 mb-6">
        {locale === 'en' ? 'Dashboard' : 'لوحة المعلومات'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-primary-600">{bookingCount}</div>
          <div className="text-sm text-gray-600">
            {locale === 'en' ? 'Total Bookings' : 'إجمالي الحجوزات'}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-primary-600">{serviceCount}</div>
          <div className="text-sm text-gray-600">
            {locale === 'en' ? 'Active Services' : 'الخدمات النشطة'}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-primary-600">
            {formatCurrency(totalRevenue, locale)}
          </div>
          <div className="text-sm text-gray-600">
            {locale === 'en' ? 'Total Revenue (est.)' : 'إجمالي الإيرادات (تقريبي)'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-primary-800 mb-4">
          {locale === 'en' ? 'Quick Actions' : 'إجراءات سريعة'}
        </h3>
        <div className="flex gap-4">
          <a
            href="/admin/bookings"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            {locale === 'en' ? 'View Bookings' : 'عرض الحجوزات'}
          </a>
          <a
            href="/admin/calendar"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {locale === 'en' ? 'Calendar View' : 'عرض التقويم'}
          </a>
        </div>
      </div>
    </div>
  );
}
