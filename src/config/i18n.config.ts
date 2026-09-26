// src/config/i18n.config.ts
export const locales = ['en', 'ar'] as const;
export const defaultLocale = 'en';
export type Locale = (typeof locales)[number];
