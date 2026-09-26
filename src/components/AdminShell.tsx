'use client';
// src/components/AdminShell.tsx — Mobile-responsive admin shell with collapsible sidebar
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';
import LanguageToggle from '@/components/LanguageToggle';

interface AdminShellProps {
  children: React.ReactNode;
  locale: 'en' | 'ar';
}

const navItems = (locale: 'en' | 'ar') => [
  { href: '/admin', label: locale === 'en' ? 'Dashboard' : 'لوحة المعلومات' },
  { href: '/admin/bookings', label: locale === 'en' ? 'Bookings' : 'الحجوزات' },
  { href: '/admin/calendar', label: locale === 'en' ? 'Calendar' : 'التقويم' },
  { href: '/admin/inquiries', label: locale === 'en' ? 'Inquiries' : 'الاستفسارات' },
  { href: '/admin/services', label: locale === 'en' ? 'Services' : 'الخدمات' },
  { href: '/admin/payments', label: locale === 'en' ? 'Payments' : 'المدفوعات' },
];

export default function AdminShell({ children, locale }: AdminShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-30 bg-white shadow-md p-2 rounded-lg touch-target"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-lg font-bold text-primary-800">
            {siteConfig.name[locale]}
          </h1>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-gray-100 touch-target"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-2">
          {navItems(locale).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm touch-target ${
                pathname.startsWith(item.href)
                  ? 'bg-primary-50 text-primary-800 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6">
          <div className="flex justify-end mb-4 lg:mb-6">
            <LanguageToggle />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
