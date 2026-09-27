// src/app/admin/inquiries/page.tsx
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export default async function AdminInquiriesPage() {
  const cookieStore = cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE');
  const locale = (rawLocale ? rawLocale.value : 'en') as 'en' | 'ar';

  const inquiries = await prisma.contactInquiry.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const statusLabels: Record<string, Record<string, string>> = {
    en: { NEW: 'New', READ: 'Read', REPLIED: 'Replied', CLOSED: 'Closed' },
    ar: { NEW: 'جديد', READ: 'تمت القراءة', REPLIED: 'تمت الإجابة', CLOSED: 'مغلق' },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary-800 mb-6">
        {locale === 'en' ? 'Contact Inquiries' : 'استفسارات التواصل'}
      </h2>

      {inquiries.length > 0 ? (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <div key={inq.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-800">{inq.name}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {inq.createdAt.toLocaleString(locale, {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="text-gray-700 mb-2">{inq.message}</p>

              {inq.email && (
                <p className="text-sm text-gray-600 mb-1">
                  <strong>{locale === 'en' ? 'Email:' : 'البريد:'}</strong> {inq.email}
                </p>
              )}
              {inq.whatsapp && (
                <p className="text-sm text-gray-600 mb-1">
                  <strong>{locale === 'en' ? 'WhatsApp:' : 'الواتساب:'}</strong> {inq.whatsapp}
                </p>
              )}

              <span className={`text-xs px-2 py-1 rounded-full ${
                inq.status === 'NEW' ? 'bg-amber-100 text-amber-800' :
                inq.status === 'READ' ? 'bg-blue-100 text-blue-800' :
                inq.status === 'REPLIED' ? 'bg-green-100 text-green-800' :
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
