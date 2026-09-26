// src/app/api/services/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const service = await prisma.service.create({
      data: {
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        durationMin: body.durationMin,
        priceEgp: body.priceEgp,
        depositPct: body.depositPct || 30,
        descriptionEn: body.descriptionEn,
        descriptionAr: body.descriptionAr,
        slug: body.slug,
        image: body.image,
      },
    });
    return NextResponse.json({ service }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
