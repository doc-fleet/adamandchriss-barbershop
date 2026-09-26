// src/app/api/bookings/customer/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { whatsapp } = body;

    if (!whatsapp || typeof whatsapp !== 'string') {
      return NextResponse.json(
        { error: 'WhatsApp number is required' },
        { status: 400 }
      );
    }

    // Find client by whatsapp
    const client = await prisma.client.findUnique({
      where: { whatsapp },
      include: {
        bookings: {
          include: {
            service: true,
            payments: true,
          },
          orderBy: { startAt: 'desc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'No account found with this WhatsApp number' },
        { status: 404 }
      );
    }

    const bookings = client.bookings.map((b) => ({
      id: b.id,
      code: b.code,
      status: b.status,
      startAt: b.startAt.toISOString(),
      locationText: b.locationText,
      depositAmount: b.depositAmount,
      balanceAmount: b.balanceAmount,
      service: b.service
        ? {
            id: b.service.id,
            nameEn: b.service.nameEn,
            nameAr: b.service.nameAr,
          }
        : null,
    }));

    return NextResponse.json({
      bookings,
      clientName: client.name,
    });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
