// src/app/api/payments/refund/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const cookieStore = cookies();
    const token = cookieStore.get('admin-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token against API
    const verifyRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/auth/verify`, {
      headers: { Cookie: `admin-token=${token}` },
      cache: 'no-store',
    });
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, bookingId, amount, reason } = body;

    if (!bookingId && !paymentId) {
      return NextResponse.json({ error: 'bookingId or paymentId required' }, { status: 400 });
    }

    // Find the payment(s) to refund
    const where: any = {};
    if (paymentId) where.id = paymentId;
    if (bookingId) where.bookingId = bookingId;

    const payments = await prisma.payment.findMany({ where });

    if (payments.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const totalRefundAmount = amount || payments.reduce((sum, p) => sum + p.amount, 0);
    const paymobApiKey = process.env.PAYMOB_API_KEY;

    const results = [];
    for (const payment of payments) {
      if (!paymobApiKey || !payment.paymobRef) {
        // Can't process via Paymob — mark as refunded manually
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED', recordedBy: 'admin' },
        });
        results.push({ paymentId: payment.id, status: 'REFUNDED', method: 'manual' });
        continue;
      }

      // Call Paymob refund API
      try {
        const refundRes = await fetch(`https://accept.paymob.com/api/acceptance/transactions/${payment.paymobRef}/refund`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paymobApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: totalRefundAmount,
            currency: payment.currency,
          }),
        });

        const refundData = await refundRes.json();

        if (refundRes.ok && refundData.success) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED', recordedBy: 'admin' },
          });
          results.push({ paymentId: payment.id, status: 'REFUNDED', method: 'paymob', paymobResponse: refundData });
        } else {
          results.push({ paymentId: payment.id, status: 'FAILED', error: refundData.message || 'Refund failed' });
        }
      } catch (err: any) {
        results.push({ paymentId: payment.id, status: 'ERROR', error: err.message });
      }
    }

    // Update booking status if refunded
    if (paymentId) {
      const payment = payments[0];
      if (payment.bookingId) {
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'CANCELLED' },
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Refund error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
