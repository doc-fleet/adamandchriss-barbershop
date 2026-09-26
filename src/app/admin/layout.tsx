// src/app/admin/layout.tsx — Admin nested layout (no html/body, uses root layout's i18n provider)
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import LanguageToggle from '@/components/LanguageToggle';
import { cookies } from 'next/headers';

async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get('admin-token')?.value;
  if (!token) return false;

  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify`,
      {
        headers: { Cookie: `admin-token=${token}` },
        cache: 'no-store',
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ar';
  const isAuthenticated = await checkAdminAuth();

  if (!isAuthenticated) {
    // Not authenticated — render children (login page) without sidebar
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-primary-800">
            {siteConfig.name[locale]}
          </h1>
          <p className="text-sm text-gray-500">
            {locale === 'en' ? 'Admin Panel' : 'لوحة التحكم'}
          </p>
        </div>
        <nav className="p-2">
          <Link href="/admin" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
            {locale === 'en' ? 'Dashboard' : 'لوحة المعلومات'}
          </Link>
          <Link href="/admin/bookings" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
            {locale === 'en' ? 'Bookings' : 'الحجوزات'}
          </Link>
          <Link href="/admin/calendar" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
            {locale === 'en' ? 'Calendar' : 'التقويم'}
          </Link>
          <Link href="/admin/inquiries" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
            {locale === 'en' ? 'Inquiries' : 'الاستفسارات'}
          </Link>
          <Link href="/admin/services" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
            {locale === 'en' ? 'Services' : 'الخدمات'}
          </Link>
          <Link href="/admin/payments" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
            {locale === 'en' ? 'Payments' : 'المدفوعات'}
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-end mb-4">
          <LanguageToggle />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
