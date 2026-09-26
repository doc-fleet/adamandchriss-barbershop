// src/lib/seed-runner.ts
import { PrismaClient } from '@prisma/client';
import { defaultServices, schedulingConfig } from '@/config/site';

const prisma = new PrismaClient();

async function main() {
  await prisma.barber.upsert({
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
          { day: 1, start: '10:00', end: '22:00' },
          { day: 2, start: '10:00', end: '22:00' },
          { day: 3, start: '10:00', end: '22:00' },
          { day: 4, start: '10:00', end: '22:00' },
          { day: 5, start: '10:00', end: '22:00' },
          { day: 6, start: '11:00', end: '18:00' },
        ],
        bufferMin: schedulingConfig.travelBufferMin,
        minLeadHours: schedulingConfig.minLeadHours,
      }),
    },
  });
  console.log('Barber seeded');

  for (const svc of defaultServices) {
    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: {
        nameEn: svc.name_en, nameAr: svc.name_ar,
        durationMin: svc.duration_min, priceEgp: svc.price_egp,
        depositPct: svc.deposit_pct,
        descriptionEn: svc.description_en, descriptionAr: svc.description_ar,
      },
      create: {
        slug: svc.slug,
        nameEn: svc.name_en, nameAr: svc.name_ar,
        durationMin: svc.duration_min, priceEgp: svc.price_egp,
        depositPct: svc.deposit_pct,
        descriptionEn: svc.description_en, descriptionAr: svc.description_ar,
      },
    });
  }
  console.log('Services seeded:', defaultServices.length);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
