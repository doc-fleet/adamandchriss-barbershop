// src/app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateBookingCode, getAvailableSlots } from '@/lib/utils';
import { defaultServices, schedulingConfig } from '@/config/site';
import { sendBookingConfirmation, sendBarberNotification } from '@/lib/notifications';

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        client: true,
        service: true,
        barber: true,
      },
      orderBy: { startAt: 'desc' },
    });
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serviceSlug, date, time, name, whatsapp, email, location, locale } = body;

    // Validate required fields
    if (!serviceSlug || !date || !time || !name || !whatsapp || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Look up the service from DB
    const dbService = await prisma.service.findUnique({
      where: { slug: serviceSlug },
    });
    if (!dbService) {
      return NextResponse.json(
        { error: 'Invalid service' },
        { status: 400 }
      );
    }
    const service = dbService;

    // Parse the selected datetime
    const selectedDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    selectedDate.setHours(hours, minutes, 0, 0);
    const endAt = new Date(selectedDate.getTime() + service.durationMin * 60 * 1000);

    // Check availability (no double-booking)
    const existing = await prisma.booking.findMany({
      where: {
        barberId: 1, // default barber
        OR: [
          {
            startAt: { lte: endAt },
            endAt: { gte: selectedDate },
          },
        ],
        status: {
          in: ['PENDING_DEPOSIT', 'CONFIRMED', 'IN_PROGRESS'],
        },
      },
    });

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Selected time slot is no longer available' },
        { status: 409 }
      );
    }

    // Create or find client
    let client = await prisma.client.findUnique({
      where: { whatsapp },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          name,
          whatsapp,
          email: email || null,
          language: locale || 'en',
        },
      });
    }

    // Create the booking
    const depositAmount = Math.round(service.priceEgp * service.depositPct / 100);
    const balanceAmount = service.priceEgp - depositAmount;
    const bookingCode = generateBookingCode();

    const booking = await prisma.booking.create({
      data: {
        code: bookingCode,
        clientId: client.id,
        barberId: 1, // default barber
        serviceId: service.id,
        startAt: selectedDate,
        endAt,
        locationText: location,
        depositAmount,
        balanceAmount,
        source: 'WEBSITE',
        language: locale || 'en',
        notes: email || null,
      },
    });

    // Initialize Paymob payment
    let paymobUrl = null;
    try {
      paymobUrl = await createPaymobPayment(bookingCode, depositAmount, booking.id);
    } catch (paymobError) {
      console.error('Paymob error:', paymobError);
      // In test mode, skip real Paymob
    }

    // --- Notifications (fire-and-forget: never block the response) ---

    // 1. Send booking confirmation to the client with full details
    const notificationBooking = {
      code: booking.code,
      startAt: booking.startAt,
      endAt: booking.endAt,
      locationText: booking.locationText,
      depositAmount: booking.depositAmount,
      balanceAmount: booking.balanceAmount,
      service: { nameEn: service.nameEn, nameAr: service.nameAr },
      barber: null,
      client: { name: client.name, whatsapp: client.whatsapp || '' },
    };
    try {
      await sendBookingConfirmation(notificationBooking, client);
    } catch (notifyError) {
      console.error('Booking confirmation notification failed:', notifyError);
    }

    // 3. Notify the assigned barber of the new booking
    try {
      const barber = await prisma.barber.findUnique({
        where: { id: booking.barberId },
      });
      if (barber) {
        await sendBarberNotification(
          notificationBooking,
          { name: barber.name, phone: barber.phone }
        );
      }
    } catch (notifyError) {
      console.error('Barber notification failed:', notifyError);
    }

    // If no Paymob URL (test mode), just return success with no redirect
    return NextResponse.json({
      bookingId: booking.id,
      bookingCode,
      paymobUrl,
      depositAmount,
      balanceAmount,
      totalAmount: service.priceEgp,
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create booking' },
      { status: 500 }
    );
  }
}

async function createPaymobPayment(bookingCode: string, amount: number, bookingId: number) {
  const apiKey = process.env.PAYMOB_API_KEY;
  const integrationId = process.env.PAYMOB_INTEGRATION_ID;

  // In test mode (no real API key), return null — use direct confirmation path
  if (!apiKey || apiKey === 'YOUR_PAYMOB_API_KEY') {
    return null;
  }

  try {
    // Step 1: Authenticate — get session token
    const authResponse = await fetch('https://accept.paymob.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
      }),
    });
    const authData = await authResponse.json();
    const token = authData.token;

    if (!token) {
      throw new Error('Paymob auth failed');
    }

    // Step 2: Create order
    const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        delivery_needed: false,
        amount_cents: amount * 100, // convert to piastres
        currency: 'EGP',
        payment_method_types: ['CARD'],
        merchant_order_id: `AC-${bookingId}`,
        items: [
          {
            name: `Deposit for ${bookingCode}`,
            amount: amount * 100,
            description: `Adam & Chriss booking deposit`,
          },
        ],
      }),
    });
    const orderData = await orderResponse.json();

    // Step 3: Create payment key
    const paymentResponse = await fetch('https://accept.paymob.com/api/ecommerce/payment_keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount_cents: amount * 100,
        currency: 'EGP',
        order_id: orderData.id,
        integration_id: integrationId,
        billing_info: {
          email: 'customer@example.com',
          first_name: 'Adam',
          last_name: 'Chriss',
        },
      }),
    });
    const paymentData = await paymentResponse.json();

    return `https://accept.paymob.com/api/accept/diopost_pay/tx/errors?payment_token=${paymentData.payment_token}&lang=en`;
  } catch (error) {
    console.error('Paymob payment creation error:', error);
    return null;
  }
}
