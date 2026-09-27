// src/app/api/inquiries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { sendAdminContactAlert } from '@/lib/notifications';

const inquirySchema = z.object({
  name: z.string().min(2),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  message: z.string().min(10),
  preferredLanguage: z.enum(['en', 'ar']).default('en'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = inquirySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: parsed.data.name,
        whatsapp: parsed.data.whatsapp || null,
        email: parsed.data.email || null,
        message: parsed.data.message,
        preferredLanguage: parsed.data.preferredLanguage,
        status: 'NEW',
      },
    });

    // Send admin notification (fire-and-forget)
    sendAdminContactAlert({
      name: inquiry.name,
      whatsapp: inquiry.whatsapp || undefined,
      email: inquiry.email || undefined,
      message: inquiry.message,
    }).catch((e: any) => console.error('Admin contact alert failed:', e));

    return NextResponse.json({ success: true, inquiryId: inquiry.id });
  } catch (error: any) {
    console.error('Inquiry error:', error);
    return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Admin-only endpoint
  const cookieStore = require('next/headers').cookies();
  const token = cookieStore.get('admin-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const where: any = {};
    if (status && status !== 'all') where.status = status;

    const inquiries = await prisma.contactInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ inquiries });
  } catch (error: any) {
    console.error('Inquiry list error:', error);
    return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 });
  }
}
