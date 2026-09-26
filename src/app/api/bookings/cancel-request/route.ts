// src/app/api/bookings/cancel-request/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId || typeof bookingId !== 'number') {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Verify the booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, service: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation requests for PENDING_DEPOSIT and CONFIRMED bookings
    if (booking.status !== 'PENDING_DEPOSIT' && booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'This booking cannot be cancelled' },
        { status: 400 }
      );
    }

    // Determine locale for service name display
    const locale = booking.language === 'ar' ? 'ar' : 'en';
    const serviceName = booking.service
      ? (locale === 'ar' ? booking.service.nameAr : booking.service.nameEn)
      : 'Service';

    const bookingDate = new Date(booking.startAt).toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    // Create an inquiry of type CANCEL_REQUEST for the admin to review
    const inquiry = await prisma.inquiry.create({
      data: {
        clientId: booking.clientId,
        type: 'CANCEL_REQUEST',
        text: `Cancellation request for booking ${booking.code} (${serviceName}) on ${bookingDate}. Client: ${booking.client?.name}, WhatsApp: ${booking.client?.whatsapp}`,
        status: 'OPEN',
      },
    });

    // Also update the booking status to CANCELLATION_PENDING to indicate it's been requested
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLATION_PENDING' },
    });

    const message = locale === 'ar'
      ? `تم استلام طلب الإلغاء للحجز ${booking.code}. سيقوم المشرف بالمراجعة والتواصل معك عبر الواتساب قريبًا.`
      : `Your cancellation request for booking ${booking.code} has been received. The admin will review and contact you via WhatsApp shortly.`;

    return NextResponse.json({
      success: true,
      message,
      inquiryId: inquiry.id,
    });
  } catch (error) {
    console.error('Error creating cancel request:', error);
    return NextResponse.json(
      { error: 'Failed to submit cancellation request' },
      { status: 500 }
    );
  }
}
