// src/app/admin/page.tsx
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import RevenueChart from '@/components/Admin/RevenueChart';

function getDayKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildLast7Days(): { day: string; label: string; amount: number }[] {
  const days: { day: string; label: string; amount: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({
      day: getDayKey(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      amount: 0,
    });
  }
  return days;
}

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ar';

  const [bookingCount, serviceCount, revenueTotal, recentBookings] = await Promise.all([
    prisma.booking.count(),
    prisma.service.count(),
    prisma.booking.aggregate({
      _sum: { depositAmount: true, balanceAmount: true },
    }),
    // Fetch bookings from the last 7 days for the chart
    prisma.booking.findMany({
      where: {
        startAt: {
          gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        startAt: true,
        depositAmount: true,
        balanceAmount: true,
        status: true,
      },
    }),
  ]);

  const totalRevenue =
    (revenueTotal._sum.depositAmount || 0) + (revenueTotal._sum.balanceAmount || 0);

  // Build 7-day revenue map (include all statuses like the existing total does)
  const dayMap = new Map(buildLast7Days().map((d) => [d.day, d]));
  for (const booking of recentBookings) {
    const dayKey = getDayKey(booking.startAt);
    if (dayMap.has(dayKey)) {
      dayMap.set(
        dayKey,
        {
          ...dayMap.get(dayKey)!,
          amount: dayMap.get(dayKey)!.amount + booking.depositAmount + booking.balanceAmount,
        },
      );
    }
  }

  const chartData = Array.from(dayMap.values()).map((d) => ({
    ...d,
    // Override label with localized short weekday name
    label: new Date(d.day + 'T12:00:00').toLocaleDateString(
      locale === 'ar' ? 'ar-EG' : 'en-US',
      { weekday: 'short' },
    ),
  }));

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

      {/* Revenue chart */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <RevenueChart data={chartData} locale={locale} />
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-primary-800 mb-4">
          {locale === 'en' ? 'Quick Actions' : 'إجراءات سريعة'}
        </h3>
        <div className="flex gap-4">
          <a
          href="/admin/bookings"
          className="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm touch-target-sm"
          >
            {locale === 'en' ? 'View Bookings' : 'عرض الحجوزات'}
          </a>
          <a
          href="/admin/calendar"
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm touch-target-sm"
          >
            {locale === 'en' ? 'Calendar View' : 'عرض التقويم'}
          </a>
        </div>
      </div>
    </div>
  );
}
