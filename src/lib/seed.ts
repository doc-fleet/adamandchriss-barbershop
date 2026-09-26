// src/lib/seed.ts
import prisma from '@/lib/prisma';
import { defaultServices, schedulingConfig } from '@/config/site';

async function main() {
  // Create default barber
  const barber = await prisma.barber.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Adam',
      phone: '+20 100 000 0000',
      languages: 'en,ar',
      active: true,
      workingHours: JSON.stringify({
        workingHours: [
          { day: 1, start: '10:00', end: '22:00' }, // Monday
          { day: 2, start: '10:00', end: '22:00' }, // Tuesday
          { day: 3, start: '10:00', end: '22:00' }, // Wednesday
          { day: 4, start: '10:00', end: '22:00' }, // Thursday
          { day: 5, start: '10:00', end: '22:00' }, // Friday
          { day: 6, start: '11:00', end: '18:00' }, // Saturday
        ],
        bufferMin: schedulingConfig.travelBufferMin,
        minLeadHours: schedulingConfig.minLeadHours,
      }),
    },
  });

  console.log('Created barber:', barber.name);

  // Seed services
  for (const svc of defaultServices) {
    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: {
        nameEn: svc.name_en,
        nameAr: svc.name_ar,
        durationMin: svc.duration_min,
        priceEgp: svc.price_egp,
        depositPct: svc.deposit_pct,
        descriptionEn: svc.description_en,
        descriptionAr: svc.description_ar,
      },
      create: {
        slug: svc.slug,
        nameEn: svc.name_en,
        nameAr: svc.name_ar,
        durationMin: svc.duration_min,
        priceEgp: svc.price_egp,
        depositPct: svc.deposit_pct,
        descriptionEn: svc.description_en,
        descriptionAr: svc.description_ar,
        image: null,
      },
    });
  }

  console.log('Services seeded:', defaultServices.length);

  // Seed availability for default barber (Mon-Sat)
  const defaultHours = [
    { day: 1, start: '10:00', end: '22:00' },
    { day: 2, start: '10:00', end: '22:00' },
    { day: 3, start: '10:00', end: '22:00' },
    { day: 4, start: '10:00', end: '22:00' },
    { day: 5, start: '10:00', end: '22:00' },
    { day: 6, start: '11:00', end: '18:00' },
  ];

  for (const wh of defaultHours) {
    await prisma.availability.upsert({
      where: { barberId_dayOfWeek: { barberId: 1, dayOfWeek: wh.day } },
      update: {
        startTime: wh.start,
        endTime: wh.end,
        bufferMin: schedulingConfig.travelBufferMin,
      },
      create: {
        barberId: 1,
        dayOfWeek: wh.day,
        startTime: wh.start,
        endTime: wh.end,
        bufferMin: schedulingConfig.travelBufferMin,
        isOff: false,
      },
    });
  }

  console.log('Availability seeded for 6 days');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
