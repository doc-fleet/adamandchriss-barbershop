// src/app/admin/services/page.tsx
'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { defaultServices } from '@/config/site';

export default function AdminServicesPage() {
  const t = useTranslations('admin');
  const locale = useLocale();

  const [services, setServices] = useState(defaultServices);

  const handleToggle = (slug: string) => {
    setServices(
      services.map((s) =>
        s.slug === slug ? { ...s, active: !s.active } : s
      )
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary-800">{t('services')}</h2>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm">
          {locale === 'en' ? '+ Add Service' : '+ إضافة خدمة'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-right py-2 px-3">{locale === 'en' ? 'Slug' : 'المعرف'}</th>
              <th className="text-right py-2 px-3">{locale === 'en' ? 'Name' : 'الاسم'}</th>
              <th className="text-right py-2 px-3">{locale === 'en' ? 'Duration' : 'المدة'}</th>
              <th className="text-right py-2 px-3">{locale === 'en' ? 'Price' : 'السعر'}</th>
              <th className="text-right py-2 px-3">{locale === 'en' ? 'Deposit %' : 'المقدار المئت'}</th>
              <th className="text-right py-2 px-3">{locale === 'en' ? 'Active' : 'نشط'}</th>
              <th className="text-right py-2 px-3">{locale === 'en' ? 'Actions' : 'الإجراءات'}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.slug} className="border-b">
                <td className="py-2 px-3 font-mono">{s.slug}</td>
                <td className="py-2 px-3">
                  {locale === 'en' ? s.name_en : s.name_ar}
                </td>
                <td className="py-2 px-3">{s.duration_min} min</td>
                <td className="py-2 px-3">{s.price_egp} EGP</td>
                <td className="py-2 px-3">{s.deposit_pct}%</td>
                <td className="py-2 px-3">
                  <button
                    onClick={() => handleToggle(s.slug)}
                    className={`px-4 py-2 text-sm rounded-full touch-target-sm ${
                      s.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {s.active ? '✓' : '✗'}
                  </button>
                </td>
                <td className="py-2 px-3">
                  <span className="text-primary-600">
                    {locale === 'en' ? 'Edit' : 'تعديل'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
