// src/app/api/webhooks/paymob/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// Verify Paymob webhook signature
function verifyPaymobSignature(body: string, signature: string): boolean {
  const secretKey = process.env.PAYMOB_API_KEY || '';
  if (!secretKey) return false;

  // Paymob HMAC verification
  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(body)
    .digest('hex');

  return hmac === signature;
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('X-Paymob-Signature') || '';

    // Verify signature (skip in test mode)
    if (process.env.PAYMOB_API_KEY && process.env.PAYMOB_API_KEY !== 'YOUR_PAYMOB_API_KEY') {
      if (!verifyPaymobSignature(body, signature)) {
        console.error('Invalid Paymob signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const { id, success, amount_cents, order } = payload;

    if (!success) {
      console.log('Payment failed:', payload);
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
    }

    // Find the booking by merchant_order_id
    const merchantOrderId = order.merchant_order_id;
    const bookingId = parseInt(merchantOrderId?.replace('AC-', '') || '0');

    if (!bookingId || isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid order reference' }, { status: 400 });
    }

    // Update booking status and create payment record
    await prisma.$transaction(async (tx) => {
      // Update booking to confirmed
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          bookingId,
          method: 'CARD',
          amount: Math.round(amount_cents / 100), // convert back to EGP
          currency: 'EGP',
          paymobRef: String(id),
          status: 'PAID',
          recordedBy: 'system',
        },
      });

      // TODO: Send WhatsApp confirmation to client
      // The webhook handler should trigger a confirmation message
    });

    console.log(`Booking ${bookingId} confirmed via Paymob payment ${id}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Paymob webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
