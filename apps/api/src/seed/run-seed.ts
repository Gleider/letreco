import { PrismaClient } from '@prisma/client';
import words from './words.json';

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${words.length} words...`);
  let inserted = 0;
  for (const text of words) {
    await prisma.word.upsert({
      where: { text },
      update: {},
      create: { text },
    });
    inserted++;
  }
  console.log(`Seed complete: ${inserted} words processed.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
