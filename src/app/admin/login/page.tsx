'use client';
// src/app/admin/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { siteConfig } from '@/config/site';

export default function AdminLoginPage() {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const otherLocale = locale === 'en' ? 'ar' : 'en';
  const otherLabel = locale === 'en' ? 'العربية' : 'English';

  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      router.push('/admin');
    } else {
      setError(result.error || 'Invalid password');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="absolute top-4 right-4 z-10">
        <a href="/admin/login" className="px-3 py-1 text-sm bg-white rounded-full shadow">
          {otherLabel}
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-primary-800 mb-6">
          {locale === 'en' ? 'Admin Login' : 'تسجيل الدخول'}
        </h1>
        <p className="text-center text-gray-600 mb-6">
          {locale === 'en' ? 'Adam & Chriss Booking Admin' : 'إدارة حجوزات آدم و كريس'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {locale === 'en' ? 'Password' : 'كلمة المرور'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={locale === 'en' ? 'Enter password' : 'أدخل كلمة المرور'}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-full transition disabled:opacity-50"
          >
            {isLoading ? '...' : (locale === 'en' ? 'Login' : 'تسجيل')}
          </button>
        </form>
      </div>
    </div>
  );
}
