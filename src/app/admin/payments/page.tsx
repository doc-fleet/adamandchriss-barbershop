// src/app/admin/payments/page.tsx
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';

const methodLabelsEn: Record<string, string> = {
  CARD: 'Card',
  QR: 'QR Code',
  CASH: 'Cash',
};

const methodLabelsAr: Record<string, string> = {
  CARD: 'بطاقة',
  QR: 'رمز استجابة',
  CASH: 'نقداً',
};

export default async function AdminPaymentsPage() {
  const cookieStore = cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE');
  const locale = (rawLocale ? rawLocale.value : 'en') as 'en' | 'ar';

  const payments = await prisma.payment.findMany({
    include: {
      booking: {
        include: { client: true, service: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const labels = locale === 'ar' ? methodLabelsAr : methodLabelsEn;

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-800 mb-6">
        {locale === 'en' ? 'Payments' : 'المدفوعات'}
      </h2>

      {payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Date' : 'التاريخ'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Booking' : 'الحجز'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Client' : 'العميل'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Method' : 'الطريقة'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Amount' : 'المبلغ'}</th>
                <th className="text-right py-2 px-3">{locale === 'en' ? 'Status' : 'الحالة'}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 px-3">
                    {p.createdAt.toLocaleDateString(locale, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </td>
                  <td className="py-2 px-3">{p.booking?.code || '—'}</td>
                  <td className="py-2 px-3">{p.booking?.client?.name || '—'}</td>
                  <td className="py-2 px-3">{labels[p.method] || p.method}</td>
                  <td className="py-2 px-3">{formatCurrency(p.amount, locale)}</td>
                  <td className="py-2 px-3">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-12">
          {locale === 'en' ? 'No payments yet' : 'لا توجد مدفوعات'}
        </p>
      )}
    </div>
  );
}