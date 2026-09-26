// src/app/layout.tsx — Root layout with i18n support
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { cookies } from 'next/headers';
import type { Locale } from '@/i18n';
import enMessages from '@/messages/en.json';
import arMessages from '@/messages/ar.json';

export const metadata = {
  title: 'Adam & Chriss — Mobile Barber',
  description: 'Elite mobile barbering service — comes to you in Cairo',
  icons: { icon: '/favicon.ico' },
};

const messagesMap: Record<Locale, any> = {
  en: enMessages as Record<string, unknown>,
  ar: arMessages as Record<string, unknown>,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Determine locale: Next.js i18n syncs to NEXT_LOCALE cookie
  const cookieStore = cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale;
  const messages = messagesMap[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="font-sans">
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          now={new Date()}
          timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
        >
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
