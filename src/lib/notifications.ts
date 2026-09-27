// src/lib/notifications.ts
// Notification service: sends WhatsApp messages via the dedicated whatsapp.ts
// transport layer (with retry + error handling) and emails via Nodemailer.
//
// Message scenarios:
//   1. Booking confirmation — sent to the client when a booking is created.
//   2. Booking status change — sent to the client on confirm / cancel /
//      reassign / reschedule (admin actions).
//   3. Barber assignment — sent to the barber when a booking is assigned or
//      reassigned to them.
import { sendWhatsAppSafe } from '@/lib/whatsapp';
import { formatCurrency } from '@/lib/utils';
import nodemailer from 'nodemailer';
import { siteConfig } from '@/config/site';

export type BookingAction = 'confirm' | 'cancel' | 'reassign' | 'reschedule';

// --- Data shapes (structural — Prisma payloads satisfy these) ---

interface BookingData {
  code: string;
  startAt: Date;
  endAt?: Date;
  locationText?: string;
  depositAmount?: number;
  balanceAmount?: number;
  service: { nameEn: string; nameAr: string } | null;
  barber: { name: string; phone?: string | null } | null;
  /** Client info attached for barber notifications. */
  client?: { name: string; whatsapp?: string | null };
}

interface ClientData {
  name: string;
  whatsapp: string | null;
  email: string | null;
  language: string;
}

interface BarberData {
  name: string;
  phone: string | null;
  language?: string;
}

interface NotificationOptions {
  newBarberName?: string;
}

// --- Locale helpers ---

function getLocale(language: string): 'en' | 'ar' {
  return language === 'ar' ? 'ar' : 'en';
}

function formatDatetime(dt: Date, locale: 'en' | 'ar'): string {
  return new Date(dt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getServiceName(
  service: { nameEn: string; nameAr: string } | null,
  locale: 'en' | 'ar'
): string {
  if (!service) return locale === 'ar' ? 'الخدمة' : 'Service';
  return locale === 'ar' ? service.nameAr : service.nameEn;
}

function formatPrice(amount: number, locale: 'en' | 'ar'): string {
  return formatCurrency(amount, locale);
}

// --- Message template variables ---

interface StatusMsgVars {
  name: string;
  code: string;
  service: string;
  datetime: string;
  newBarber?: string;
}

interface ConfirmationMsgVars {
  name: string;
  code: string;
  service: string;
  datetime: string;
  location: string;
  deposit: string;
  balance: string;
  total: string;
}

interface BarberMsgVars {
  barberName: string;
  code: string;
  service: string;
  datetime: string;
  location: string;
  clientName: string;
  clientPhone: string;
}

// --- Message templates: status changes (bilingual EN/AR) ---

const SUBJECTS: Record<BookingAction, Record<'en' | 'ar', string>> = {
  confirm: { en: 'Booking Confirmed', ar: 'تم تأكيد الحجز' },
  cancel: { en: 'Booking Cancelled', ar: 'تم إلغاء الحجز' },
  reassign: { en: 'Barber Changed', ar: 'تم تغيير الحلاق' },
  reschedule: { en: 'Booking Rescheduled', ar: 'تمت إعادة جدولة الحجز' },
};

const MESSAGES: Record<
  BookingAction,
  Record<'en' | 'ar', (vars: StatusMsgVars) => string>
> = {
  confirm: {
    en: ({ name, code, service, datetime }) =>
      `Hi ${name}! Your booking ${code} for ${service} on ${datetime} has been confirmed. See you soon!`,
    ar: ({ name, code, service, datetime }) =>
      `مرحبا ${name}! تم تأكيد حجزك ${code} لـ ${service} في ${datetime}. نراك قريبا!`,
  },
  cancel: {
    en: ({ name, code, datetime }) =>
      `Hi ${name}, your booking ${code} on ${datetime} has been cancelled. If you think this is an error, please contact us.`,
    ar: ({ name, code, datetime }) =>
      `مرحبا ${name}، تم إلغاء حجزك ${code} في ${datetime}. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل معنا.`,
  },
  reassign: {
    en: ({ name, code, datetime, newBarber }) =>
      `Hi ${name}, the barber for your booking ${code} on ${datetime} has been changed to ${newBarber}. See you soon!`,
    ar: ({ name, code, datetime, newBarber }) =>
      `مرحبا ${name}، تم تغيير الحلاق لحجزك ${code} في ${datetime} إلى ${newBarber}. نراك قريبا!`,
  },
  reschedule: {
    en: ({ name, code, datetime }) =>
      `Hi ${name}, your booking ${code} has been rescheduled. New time: ${datetime}. If this doesn't work, please contact us.`,
    ar: ({ name, code, datetime }) =>
      `مرحبا ${name}، تمت إعادة جدولة حجزك ${code}. الوقت الجديد: ${datetime}. إذا لم يناسبك، يرجى التواصل معنا.`,
  },
};

// --- Message templates: booking confirmation (on creation) ---

const CONFIRMATION_SUBJECTS: Record<'en' | 'ar', string> = {
  en: 'Booking Confirmation',
  ar: 'تأكيد الحجز',
};

const CONFIRMATION_MESSAGES: Record<
  'en' | 'ar',
  (vars: ConfirmationMsgVars) => string
> = {
  en: ({ name, code, service, datetime, location, deposit, balance, total }) =>
    `Hi ${name}! Your booking ${code} has been received and is pending confirmation.\n\n` +
    `Service: ${service}\n` +
    `Date & Time: ${datetime}\n` +
    `Location: ${location}\n` +
    `Deposit paid: ${deposit}\n` +
    `Balance due: ${balance}\n` +
    `Total: ${total}\n\n` +
    `We'll confirm your booking once payment is verified. See you soon!`,
  ar: ({ name, code, service, datetime, location, deposit, balance, total }) =>
    `مرحبا ${name}! تم استلام حجزك ${code} وهو قيد الانتظار للتأكيد.\n\n` +
    `الخدمة: ${service}\n` +
    `التاريخ والوقت: ${datetime}\n` +
    `الموقع: ${location}\n` +
    `المقدار المدفوع: ${deposit}\n` +
    `المتبقي: ${balance}\n` +
    `الإجمالي: ${total}\n\n` +
    `سيتم تأكيد حجزك عند التحقق من الدفع. نراك قريبا!`,
};

// --- Message templates: barber assignment ---

const BARBER_SUBJECTS: Record<'en' | 'ar', string> = {
  en: 'New Booking Assigned',
  ar: 'تم تعيين حجز جديد',
};

const BARBER_MESSAGES: Record<
  'en' | 'ar',
  (vars: BarberMsgVars) => string
> = {
  en: ({ barberName, code, service, datetime, location, clientName, clientPhone }) =>
    `Hi ${barberName}! Booking ${code} has been assigned to you.\n\n` +
    `Client: ${clientName} (${clientPhone})\n` +
    `Service: ${service}\n` +
    `Date & Time: ${datetime}\n` +
    `Location: ${location}\n\n` +
    `Please confirm your availability.`,
  ar: ({ barberName, code, service, datetime, location, clientName, clientPhone }) =>
    `مرحبا ${barberName}! تم تعيين حجز ${code} لك.\n\n` +
    `العميل: ${clientName} (${clientPhone})\n` +
    `الخدمة: ${service}\n` +
    `التاريخ والوقت: ${datetime}\n` +
    `الموقع: ${location}\n\n` +
    `يرجى تأكيد توافرك.`,
};

// --- Transport wrappers ---

/**
 * Send a WhatsApp message via the dedicated transport module.
 * Throws on failure so callers can catch and log.
 */
async function sendWhatsApp(to: string, body: string): Promise<void> {
  const result = await sendWhatsAppSafe(to, body);
  if (!result.success) {
    throw new Error(result.error || 'WhatsApp send failed');
  }
}

// --- Email transport (Nodemailer) ---

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    console.log(
      `[notifications] SMTP not configured — would send email to ${to}: ${text}`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort || '587', 10),
    secure: smtpPort === '465',
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text,
    html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
  });
  console.log(`[notifications] Email sent to ${to}`);
}

// --- Public API ---

/**
 * Sends a notification to the client about a booking status change.
 * Sends via WhatsApp (if Twilio configured + client has a number)
 * and email (if SMTP configured + client has an email).
 * Never throws — all errors are logged and swallowed.
 */
export async function sendBookingNotification(
  booking: BookingData,
  client: ClientData,
  action: BookingAction,
  options?: NotificationOptions
): Promise<void> {
  try {
    const locale = getLocale(client.language);
    const serviceName = getServiceName(booking.service, locale);
    const datetime = formatDatetime(booking.startAt, locale);

    const message = MESSAGES[action][locale]({
      name: client.name,
      code: booking.code,
      service: serviceName,
      datetime,
      newBarber: options?.newBarberName,
    });

    const subject = SUBJECTS[action][locale];

    // WhatsApp
    if (client.whatsapp) {
      try {
        await sendWhatsApp(client.whatsapp, message);
      } catch (error) {
        console.error('[notifications] WhatsApp send failed:', error);
      }
    } else {
      console.log('[notifications] No WhatsApp number for client, skipping');
    }

    // Email
    if (client.email) {
      try {
        await sendEmail(client.email, subject, message);
      } catch (error) {
        console.error('[notifications] Email send failed:', error);
      }
    } else {
      console.log('[notifications] No email on file for client, skipping');
    }
  } catch (error) {
    console.error('[notifications] Failed to send notification:', error);
  }
}

// --- Contact form inquiries (admin notification) ---

interface ContactInquiryData {
  name: string;
  whatsapp: string | null;
  email: string | null;
  message: string;
  preferredLanguage: string;
}

/**
 * Sends an admin notification email for a new contact-form inquiry.
 * Reuses the same SMTP transport as booking notifications and degrades
 * gracefully to a log line when SMTP is not configured (test mode).
 * Never throws — all errors are logged and swallowed.
 */
export async function sendContactInquiryNotification(
  inquiry: ContactInquiryData
): Promise<void> {
  try {
    const locale = inquiry.preferredLanguage === 'ar' ? 'ar' : 'en';
    const subject =
      locale === 'ar'
        ? 'استفسار جديد من نموذج الاتصال — آدم و كريس'
        : 'New Contact Inquiry — Adam & Chriss';

    const linesEn = [
      'A new contact-form inquiry was received on the website.',
      '',
      `Name: ${inquiry.name}`,
      `WhatsApp: ${inquiry.whatsapp || '—'}`,
      `Email: ${inquiry.email || '—'}`,
      `Preferred Language: ${inquiry.preferredLanguage || 'en'}`,
      '',
      'Message:',
      inquiry.message,
    ];
    const linesAr = [
      'تم استلام استفسار جديد من نموذج الاتصال على الموقع.',
      '',
      `الاسم: ${inquiry.name}`,
      `الواتساب: ${inquiry.whatsapp || '—'}`,
      `البريد الإلكتروني: ${inquiry.email || '—'}`,
      `اللغة المفضلة: ${inquiry.preferredLanguage || 'en'}`,
      '',
      'الرسالة:',
      inquiry.message,
    ];
    const body = locale === 'ar' ? linesAr.join('\n') : linesEn.join('\n');

    await sendEmail(siteConfig.email, subject, body);
  } catch (error) {
    console.error(
      '[notifications] Failed to send contact inquiry notification:',
      error
    );
  }
}

/**
 * Sends a booking confirmation message to the client when a booking is created.
 * Includes full details: service, datetime, location, prices.
 * Never throws — all errors are logged and swallowed.
 */
export async function sendBookingConfirmation(
  booking: BookingData,
  client: ClientData
): Promise<void> {
  try {
    const locale = getLocale(client.language);
    const serviceName = getServiceName(booking.service, locale);
    const datetime = formatDatetime(booking.startAt, locale);
    const deposit = formatPrice(booking.depositAmount || 0, locale);
    const balance = formatPrice(booking.balanceAmount || 0, locale);
    const total = formatPrice(
      (booking.depositAmount || 0) + (booking.balanceAmount || 0),
      locale
    );
    const location = booking.locationText || (locale === 'ar' ? 'غير محدد' : 'Not specified');

    const message = CONFIRMATION_MESSAGES[locale]({
      name: client.name,
      code: booking.code,
      service: serviceName,
      datetime,
      location,
      deposit,
      balance,
      total,
    });

    const subject = CONFIRMATION_SUBJECTS[locale];

    // WhatsApp
    if (client.whatsapp) {
      try {
        await sendWhatsApp(client.whatsapp, message);
      } catch (error) {
        console.error('[notifications] WhatsApp confirmation failed:', error);
      }
    } else {
      console.log('[notifications] No WhatsApp number for client, skipping confirmation');
    }

    // Email (fallback)
    if (client.email) {
      try {
        await sendEmail(client.email, subject, message);
      } catch (error) {
        console.error('[notifications] Email confirmation failed:', error);
      }
    }
  } catch (error) {
    console.error('[notifications] Failed to send confirmation:', error);
  }
}

/**
 * Sends a barber assignment notification via WhatsApp when a booking is
 * assigned or reassigned to a barber.
 * Never throws — all errors are logged and swallowed.
 */
export async function sendBarberNotification(
  booking: BookingData,
  barber: BarberData,
  options?: NotificationOptions
): Promise<void> {
  try {
    const locale = getLocale(barber.language || 'en');
    const serviceName = getServiceName(booking.service, locale);
    const datetime = formatDatetime(booking.startAt, locale);
    const location = booking.locationText || (locale === 'ar' ? 'غير محدد' : 'Not specified');
    const clientName = booking.client?.name || (locale === 'ar' ? 'عميل' : 'Client');
    const clientPhone = booking.client?.whatsapp || '';

    const message = BARBER_MESSAGES[locale]({
      barberName: barber.name,
      code: booking.code,
      service: serviceName,
      datetime,
      location,
      clientName,
      clientPhone,
    });

    const subject = BARBER_SUBJECTS[locale];

    // WhatsApp
    if (barber.phone) {
      try {
        await sendWhatsApp(barber.phone, message);
      } catch (error) {
        console.error('[notifications] Barber WhatsApp notification failed:', error);
      }
    } else {
      console.log('[notifications] No phone number for barber, skipping assignment notification');
    }

    // Email (if a barber email is ever added to the model)
    // Currently Barber has no email field, so only WhatsApp is sent.
  } catch (error) {
    console.error('[notifications] Failed to send barber notification:', error);
  }
}
