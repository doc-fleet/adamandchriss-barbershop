// src/app/admin/layout.tsx — Admin nested layout (no html/body, uses root layout's i18n provider)
import { cookies } from 'next/headers';
import AdminShell from '@/components/AdminShell';

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
    return <>{children}</>;
  }

  return (
    <AdminShell locale={locale}>
      {children}
    </AdminShell>
  );
}
