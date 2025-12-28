const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(){
  await prisma.drink.createMany({
    data: [
      { name_en: 'Beer', name_fr: 'Bière', price_cents: 600, taxable: true },
      { name_en: 'Soda', name_fr: 'Soda', price_cents: 300, taxable: false }
    ],
    skipDuplicates: true
  });

  await prisma.tableType.createMany({
    data: [
      { name_en: 'American', name_fr: 'Américaine', base_hourly_cents: 3000 },
      { name_en: 'Pool', name_fr: 'Pool', base_hourly_cents: 2500 },
      { name_en: 'Snooker', name_fr: 'Snooker', base_hourly_cents: 4000 },
      { name_en: 'French', name_fr: 'Française', base_hourly_cents: 3500 }
    ],
    skipDuplicates: true
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
