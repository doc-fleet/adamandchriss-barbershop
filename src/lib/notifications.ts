// src/lib/notifications.ts — Email notification service using Nodemailer
import nodemailer, { Transporter } from 'nodemailer';
import type { Booking, Client, Service, Barber } from '@prisma/client';

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
};

const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || '';
const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || '';

let transporter: Transporter | null = null;

function getTransporter() {
  if (!transporter && smtpConfig.host) {
    transporter = nodemailer.createTransport(smtpConfig);
  }
  return transporter;
}

export async function sendBookingConfirmation(
  client: Client,
  booking: Booking & { service?: Service | null; barber: Barber },
) {
  if (!client.email) return { sent: false, reason: 'No email for client' };
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'SMTP not configured' };

  const totalAmount = booking.depositAmount + booking.balanceAmount;
  const locale = client.language || 'en';

  const subject = locale === 'en'
    ? `Booking ${booking.code} Confirmed — Adam & Chriss`
    : `تم تأكيد الحجز ${booking.code} - آدم و كريس`;

  const html = locale === 'en'
    ? `<h2>Booking Confirmed: ${booking.code}</h2><p>Service: ${booking.service?.nameEn || 'Custom Service'}</p><p>Barber: ${booking.barber.name}</p><p>Date & Time: ${booking.startAt.toLocaleString('en-US')}</p><p>Location: ${booking.locationText}</p><p>Deposit paid: ${booking.depositAmount} EGP</p><p>Balance to pay on-site: ${booking.balanceAmount} EGP</p><p>Total: ${totalAmount} EGP</p>`
    : `<h2>تم تأكيد الحجز: ${booking.code}</h2><p>الخدمة: ${booking.service?.nameAr || 'خدمة مخصصة'}</p><p>الحلاق: ${booking.barber.name}</p><p>التاريخ والوقت: ${booking.startAt.toLocaleString('ar-EG')}</p><p>الموقع: ${booking.locationText}</p><p>الإيداع المدفوع: ${booking.depositAmount} جنيه</p><p>الرصيد المتبقي: ${booking.balanceAmount} جنيه</p><p>المجموع: ${totalAmount} جنيه</p>`;

  try {
    await t.sendMail({ from: fromEmail, to: client.email, subject, html });
    return { sent: true };
  } catch (error: any) {
    console.error('Failed to send booking confirmation email:', error);
    return { sent: false, error: error.message };
  }
}

export async function sendAdminAlert(
  booking: Booking & { client: Client; service?: Service | null; barber: Barber },
) {
  if (!adminEmail) return { sent: false, reason: 'No admin email configured' };
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'SMTP not configured' };
  const totalAmount = booking.depositAmount + booking.balanceAmount;
  try {
    await t.sendMail({
      from: fromEmail, to: adminEmail,
      subject: `New Booking ${booking.code} — ${booking.client.name}`,
      html: `<h2>New Booking: ${booking.code}</h2><p>Client: ${booking.client.name} (${booking.client.whatsapp || booking.client.email || 'N/A'})</p><p>Service: ${booking.service?.nameEn || 'Custom Service'}</p><p>Barber: ${booking.barber.name}</p><p>Date & Time: ${booking.startAt.toLocaleString('en-US')}</p><p>Location: ${booking.locationText}</p><p>Deposit: ${booking.depositAmount} EGP | Balance: ${booking.balanceAmount} EGP | Total: ${totalAmount} EGP</p>`,
    });
    return { sent: true };
  } catch (error: any) {
    console.error('Failed to send admin alert email:', error);
    return { sent: false, error: error.message };
  }
}

export async function sendStatusUpdate(
  client: Client,
  booking: Booking & { service?: Service | null; barber: Barber },
) {
  if (!client.email) return { sent: false, reason: 'No email for client' };
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'SMTP not configured' };
  const locale = client.language || 'en';
  const subject = locale === 'en' ? `Booking ${booking.code} Status Update` : `تحديث حالة الحجز ${booking.code}`;

  const statusLabel: Record<string, Record<string, string>> = {
    en: { CONFIRMED: 'Confirmed', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No Show' },
    ar: { CONFIRMED: 'مؤكد', IN_PROGRESS: 'جارٍ الإنجاز', COMPLETED: 'مكتمل', CANCELLED: 'ملغي', NO_SHOW: 'لم يأتِ' },
  };
  const status = statusLabel[locale]?.[booking.status] || booking.status;
  const serviceName = locale === 'en' ? booking.service?.nameEn : booking.service?.nameAr;

  try {
    await t.sendMail({
      from: fromEmail, to: client.email, subject,
      html: `<h2>${locale === 'en' ? 'Booking Status Update' : 'تحديق حالة الحجز'}</h2><p>${locale === 'en' ? 'Your booking' : 'حجزك'} ${booking.code} ${locale === 'en' ? 'is now' : 'الآن'}: <strong>${status}</strong></p><p>${locale === 'en' ? 'Service' : 'الخدمة'}: ${serviceName || '—'}</p>`,
    });
    return { sent: true };
  } catch (error: any) {
    console.error('Failed to send status update email:', error);
    return { sent: false, error: error.message };
  }
}


// Send an admin alert when a new contact inquiry is submitted
export async function sendAdminContactAlert(
  inquiry: { name: string; whatsapp?: string; email?: string; message: string },
) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'SMTP not configured' };

  const html = `
    <h2>New Contact Inquiry</h2>
    <p><strong>Name:</strong> ${inquiry.name}</p>
    ${inquiry.whatsapp ? `<p><strong>WhatsApp:</strong> ${inquiry.whatsapp}</p>` : ''}
    ${inquiry.email ? `<p><strong>Email:</strong> ${inquiry.email}</p>` : ''}
    <p><strong>Message:</strong> ${inquiry.message}</p>
  `;

  try {
    await t.sendMail({
      from: fromEmail,
      to: adminEmail,
      subject: `New Contact Inquiry from ${inquiry.name}`,
      html,
    });
    return { sent: true };
  } catch (error: any) {
    console.error('Failed to send contact inquiry alert:', error);
    return { sent: false, error: error.message };
  }
}


// ─── Admin booking action notifications ───

export type BookingAction = 'confirm' | 'cancel' | 'reassign' | 'reschedule';

const ACTION_LABELS = {
  en: { confirm: 'Confirmed', cancel: 'Cancelled', reassign: 'Reassigned', reschedule: 'Rescheduled' },
  ar: { confirm: 'مؤكد', cancel: 'ملغي', reassign: 'تغيير حلاق', reschedule: 'إعادة جدولة' },
};

/**
 * Notify the client (email + WhatsApp) about a booking action
 * performed by an admin (confirm, cancel, reassign, reschedule).
 */
export async function sendBookingNotification(
  booking: Booking & { client: Client; service?: Service | null; barber: Barber },
  client: Client,
  action: BookingAction,
  options?: { newBarberName?: string },
) {
  const locale = (client.language || 'en') as 'en' | 'ar';
  const totalAmount = booking.depositAmount + booking.balanceAmount;
  const actionLabel = ACTION_LABELS[locale][action];
  const serviceName = locale === 'en'
    ? booking.service?.nameEn || 'Custom Service'
    : booking.service?.nameAr || 'خدمة مخصصة';
  const timeStr = booking.startAt.toLocaleString(locale === 'en' ? 'en-US' : 'ar-EG');

  // --- Email ---
  const t = getTransporter();
  if (t && client.email) {
    const subject = locale === 'en'
      ? `Booking ${booking.code} ${actionLabel}`
      : `${actionLabel} حجز ${booking.code}`;
    let html = `<h2>${subject}</h2>`;
    html += `<p><strong>${locale === 'en' ? 'Service' : 'الخدمة'}:</strong> ${serviceName}</p>`;
    if (action === 'reassign' && options?.newBarberName) {
      html += `<p><strong>${locale === 'en' ? 'New Barber' : 'الحلاق الجديد'}:</strong> ${options.newBarberName}</p>`;
    }
    html += `<p><strong>${locale === 'en' ? 'Barber' : 'الحلاق'}:</strong> ${booking.barber?.name || '—'}</p>`;
    html += `<p><strong>${locale === 'en' ? 'Date & Time' : 'التاريخ والوقت'}:</strong> ${timeStr}</p>`;
    html += `<p><strong>${locale === 'en' ? 'Total' : 'المجموع'}:</strong> ${totalAmount} EGP</p>`;
    try {
      await t.sendMail({ from: fromEmail, to: client.email, subject, html });
    } catch (error: any) {
      console.error('Booking action email failed:', error);
    }
  }

  // --- WhatsApp ---
  try {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
    const to = client.whatsapp || client.phone || null;
    if (to) {
      const labelService = locale === 'en' ? 'Service' : 'الخدمة';
      const labelBarber = locale === 'en' ? 'Barber' : 'الحلاق';
      const sms = locale === 'en'
        ? `${actionLabel} ✓ Booking ${booking.code}
${labelService}: ${serviceName}
${labelBarber}: ${booking.barber?.name || '—'}
${timeStr}`
        : `${actionLabel} ✓ حجز ${booking.code}
${labelService}: ${serviceName}
${labelBarber}: ${booking.barber?.name || '—'}
${timeStr}`;
      await sendWhatsAppMessage(to, sms);
    }
  } catch (error: any) {
    console.error('Booking action WhatsApp failed:', error);
  }
}

/** Notify a barber (via WhatsApp) that a booking was reassigned to them. */
export async function sendBarberNotification(
  booking: Booking & { service?: Service | null },
  barber: { name: string; phone: string },
) {
  const serviceName = booking.service?.nameEn || 'Custom Service';
  const message = `✂️ New Booking Assigned!\nBooking: ${booking.code}\nService: ${serviceName}\nClient: ${booking.locationText}\nTime: ${booking.startAt.toLocaleString('en-US')}`;
  try {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
    await sendWhatsAppMessage(barber.phone, message);
  } catch (error: any) {
    console.error('Barber notification failed:', error);
  }
}
