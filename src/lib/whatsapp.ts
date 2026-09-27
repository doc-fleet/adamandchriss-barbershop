// src/lib/whatsapp.ts — WhatsApp notification service using Twilio
import twilio from 'twilio';
import type { Booking, Client, Service, Barber } from '@prisma/client';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client && accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

// Clean phone number to E.164 format (e.g. +201000000000)
function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  if (digits.startsWith('0')) return '+20' + digits.slice(1);
  if (!digits.startsWith('+')) return '+' + digits;
  return '+' + digits;
}

export async function sendWhatsAppMessage(
  to: string | null | undefined,
  message: string,
) {
  const toNumber = cleanPhone(to);
  if (!toNumber) return { sent: false, reason: 'No phone number' };
  const t = getClient();
  if (!t) return { sent: false, reason: 'Twilio not configured' };

  try {
    await t.messages.create({ from: fromNumber, to: toNumber, body: message });
    return { sent: true };
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error);
    return { sent: false, error: error.message };
  }
}

export async function sendBookingConfirmationWhatsApp(
  client: Client,
  booking: Booking & { service?: Service | null; barber: Barber },
) {
  const to = client.whatsapp || client.phone;
  const totalAmount = booking.depositAmount + booking.balanceAmount;
  const locale = client.language || 'en';
  const serviceName = locale === 'en' ? booking.service?.nameEn || 'Custom Service' : booking.service?.nameAr || 'خدمة مخصصة';

  const message = locale === 'en'
    ? `✅ Booking ${booking.code} Confirmed!\nService: ${serviceName}\nBarber: ${booking.barber.name}\nDate: ${booking.startAt.toLocaleString('en-US')}\nLocation: ${booking.locationText}\nDeposit: ${booking.depositAmount} EGP | Balance: ${booking.balanceAmount} EGP | Total: ${totalAmount} EGP\nWe'll remind you 2 hours before your appointment.`
    : `✅ تم تأكيد الحجز ${booking.code}!\nالخدمة: ${serviceName}\nالحلاق: ${booking.barber.name}\nالتاريخ: ${booking.startAt.toLocaleString('ar-EG')}\nالموقع: ${booking.locationText}\nالإيداع: ${booking.depositAmount} جنيه | الرصيد: ${booking.balanceAmount} جنيه | المجموع: ${totalAmount} جنيه\nسنذكُّك قبل 2 ساعات من موعدك.`;

  return await sendWhatsAppMessage(to, message);
}

export async function sendStatusUpdateWhatsApp(
  client: Client,
  booking: Booking,
) {
  const to = client.whatsapp || client.phone;
  const locale = client.language || 'en';
  const arStatusLabels: Record<string, string> = {
    CONFIRMED: 'مؤكد', IN_PROGRESS: 'جارٍ الإنجاز',
    COMPLETED: 'مكتمل', CANCELLED: 'ملغي', NO_SHOW: 'لم يأتِ',
  };
  const statusLabel = locale === 'en' ? booking.status : (arStatusLabels[booking.status] || booking.status);

  const message = locale === 'en'
    ? `📱 Your booking ${booking.code} status is now: ${statusLabel}`
    : `📱 حالة حجزك ${booking.code} الآن: ${statusLabel}`;

  return await sendWhatsAppMessage(to, message);
}

export async function sendBarberAssignmentWhatsApp(
  barber: Barber,
  booking: Booking & { service?: Service | null },
) {
  const serviceName = booking.service?.nameEn || 'Custom Service';
  const message = `✂️ New Booking Assigned!\nBooking: ${booking.code}\nService: ${serviceName}\nClient: ${booking.locationText}\nTime: ${booking.startAt.toLocaleString('en-US')}\nView in admin: /admin/bookings/${booking.id}`;
  return await sendWhatsAppMessage(barber.phone, message);
}
