// src/app/admin/calendar/page.tsx
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

type TimeSlot = { hour: number; display: string };

type StatusLabels = Record<string, Record<string, string>>;

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const cookieStore = cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE');
  const locale = (rawLocale ? rawLocale.value : 'en') as 'en' | 'ar';

  // Default to today
  const dateParam = searchParams.date;
  let targetDate = new Date();
  if (dateParam) {
    targetDate = new Date(dateParam);
  }

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      startAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      client: true,
      service: true,
      payments: true,
    },
    orderBy: { startAt: 'asc' },
  });

  const workingHoursStart = 10;
  const workingHoursEnd = 22;
  const timeSlots: TimeSlot[] = [];
  for (let h = workingHoursStart; h <= workingHoursEnd; h++) {
    timeSlots.push({ hour: h, display: `${h.toString().padStart(2, '0')}:00` });
  }

  const statusLabels: StatusLabels = {
    en: {
      PENDING_DEPOSIT: 'Pending Deposit',
      CONFIRMED: 'Confirmed',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    },
    ar: {
      PENDING_DEPOSIT: 'في انتظار الإيداع',
      CONFIRMED: 'مؤكد',
      IN_PROGRESS: 'جارٍ الإنجاز',
      COMPLETED: 'مكتمل',
      CANCELLED: 'ملغي',
    },
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'CONFIRMED':
        return 'border-green-500 bg-green-50';
      case 'PENDING_DEPOSIT':
        return 'border-amber-500 bg-amber-50';
      case 'COMPLETED':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-800">
          {locale === 'en' ? 'Calendar' : 'التقويم'}
        </h2>
      </div>

      <p className="text-gray-600 mb-4">
        {targetDate.toLocaleDateString(locale, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      <div className="space-y-1">
        {timeSlots.map((slot) => {
          const slotBookings = bookings.filter(
            (b) => b.startAt.getHours() === slot.hour
          );

          return (
            <div
              key={slot.hour}
              className="flex items-center gap-4 border-b border-gray-100 py-2"
            >
              <span className="w-16 text-sm font-medium text-gray-500">
                {slot.display}
              </span>
              <div className="flex-1 flex flex-wrap gap-2">
                {slotBookings.length > 0 ? (
                  slotBookings.map((booking) => {
                    const statusClass = getStatusClass(booking.status);
                    const clientName = booking.client
                      ? booking.client.name
                      : '—';
                    const serviceName =
                      locale === 'en'
                        ? booking.service
                          ? booking.service.nameEn
                          : '—'
                        : booking.service
                          ? booking.service.nameAr
                          : '—';

                    return (
                      <div
                        key={booking.id}
                        className={`px-3 py-2 rounded-lg text-sm border-l-4 ${statusClass}`}
                      >
                        <div className="font-medium">{clientName}</div>
                        <div className="text-gray-600">
                          {booking.startAt.toLocaleTimeString(locale, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' - '}
                          {booking.endAt.toLocaleTimeString(locale, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {serviceName}
                          {' · '}
                          {statusLabels[locale][booking.status] || booking.status}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-gray-400 text-sm">
                    {locale === 'en' ? 'Free' : 'متاح'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
