// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var prisma` to survive hot reloads in dev
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

export default prisma;
