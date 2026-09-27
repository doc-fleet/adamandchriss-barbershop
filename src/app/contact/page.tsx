// src/app/contact/page.tsx
'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { siteConfig } from '@/config/site';
import Header from '@/components/Header';
import LanguageToggle from '@/components/LanguageToggle';

export default function ContactPage() {
  const t = useTranslations('contact');
  const locale = useLocale() as 'en' | 'ar';
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, preferredLanguage: locale }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="absolute top-4 right-4 z-10">
          <LanguageToggle />
        </div>
        <Header />
        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="butt" strokeLinejoin="miter" strokeWidth={2} stroke="currentColor" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-primary-800 mb-4">{t('success')}</h2>
            <p className="text-gray-600">{t('success')}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-primary-800 mb-6">{t('title')}</h1>
          <p className="text-gray-600 mb-8">{t('subtitle')}</p>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">{t('name')}</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('whatsapp')}</label>
              <input
                type="tel"
                placeholder="+20 100 000 0000"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('email')}</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('message')}</label>
              <textarea
                rows={5}
                required
                minLength={10}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-full transition disabled:opacity-50"
            >
              {isSubmitting ? '...' : t('send')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>{siteConfig.phone}</p>
            <p>{siteConfig.email}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
