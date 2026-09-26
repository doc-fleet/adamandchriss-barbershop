// src/app/admin/inquiries/page.tsx
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export default async function AdminInquiriesPage() {
  const cookieStore = cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE');
  const locale = (rawLocale ? rawLocale.value : 'en') as 'en' | 'ar';

  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: true, booking: true },
  });

  const typeLabels: Record<string, Record<string, string>> = {
    en: { CUSTOM: 'Custom Request', CALLBACK: 'Callback', OTHER: 'Other' },
    ar: { CUSTOM: 'طلب مخصص', CALLBACK: 'طلب مكالمة', OTHER: 'آخر' },
  };

  const statusLabels: Record<string, Record<string, string>> = {
    en: { OPEN: 'Open', REPLIED: 'Replied', CONVERTED: 'Converted', CLOSED: 'Closed' },
    ar: { OPEN: 'مفتوح', REPLIED: 'تمت الإجابة', CONVERTED: 'محول لحجز', CLOSED: 'مغلق' },
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-800 mb-6">
        {locale === 'en' ? 'Inquiries' : 'الاستفسارات'}
      </h2>

      {inquiries.length > 0 ? (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <div key={inq.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {typeLabels[locale][inq.type] || inq.type}
                </span>
                <span className="text-xs text-gray-500">
                  {inq.createdAt.toLocaleString(locale, {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-gray-800 mb-2">{inq.text}</p>
              {inq.agentSummary && (
                <p className="text-sm text-gray-600 mb-2">
                  <strong>{locale === 'en' ? 'Agent Summary:' : 'ملخص الوكلاء:'}</strong> {inq.agentSummary}
                </p>
              )}
              {inq.client && (
                <p className="text-sm text-gray-600 mb-2">
                  <strong>{locale === 'en' ? 'Client:' : 'العميل:'}</strong> {inq.client.name}
                  {inq.client.whatsapp && ` · ${inq.client.whatsapp}`}
                </p>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${
                inq.status === 'OPEN' ? 'bg-amber-100 text-amber-800' :
                inq.status === 'REPLIED' ? 'bg-blue-100 text-blue-800' :
                inq.status === 'CONVERTED' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {statusLabels[locale][inq.status] || inq.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-12">
          {locale === 'en' ? 'No inquiries yet' : 'لا توجد استفسارات'}
        </p>
      )}
    </div>
  );
}
