// src/lib/notifications.ts
// Notification service: sends WhatsApp messages via Twilio and emails via Nodemailer.
// Gracefully degrades when credentials are not configured (test mode).
import twilio from 'twilio';
import nodemailer from 'nodemailer';

export type BookingAction = 'confirm' | 'cancel' | 'reassign' | 'reschedule';

interface BookingData {
  code: string;
  startAt: Date;
  service: { nameEn: string; nameAr: string } | null;
  barber: { name: string } | null;
}

interface ClientData {
  name: string;
  whatsapp: string | null;
  email: string | null;
  language: string;
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

// --- Message templates (bilingual) ---

interface MessageVars {
  name: string;
  code: string;
  service: string;
  datetime: string;
  newBarber?: string;
}

const SUBJECTS: Record<BookingAction, Record<'en' | 'ar', string>> = {
  confirm: { en: 'Booking Confirmed', ar: 'تم تأكيد الحجز' },
  cancel: { en: 'Booking Cancelled', ar: 'تم إلغاء الحجز' },
  reassign: { en: 'Barber Changed', ar: 'تم تغيير الحلاق' },
  reschedule: { en: 'Booking Rescheduled', ar: 'تمت إعادة جدولة الحجز' },
};

const MESSAGES: Record<
  BookingAction,
  Record<'en' | 'ar', (vars: MessageVars) => string>
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

// --- Transport: WhatsApp (Twilio) ---

async function sendWhatsApp(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.log(
      `[notifications] Twilio not configured — would send WhatsApp to ${to}: ${body}`
    );
    return;
  }

  const client = twilio(accountSid, authToken);
  const formattedTo = to.startsWith('+') ? to : `+${to}`;
  await client.messages.create({
    from: `whatsapp:${from}`,
    to: `whatsapp:${formattedTo}`,
    body,
  });
  console.log(`[notifications] WhatsApp sent to ${formattedTo}`);
}

// --- Transport: Email (Nodemailer) ---

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
 * Sends a notification to the client about a booking action.
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
