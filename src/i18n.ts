// src/i18n.ts
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ar'] as const;
export const defaultLocale = 'en';
export type Locale = (typeof locales)[number];

export default getRequestConfig(async function (locale) {
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { messages };
});
