const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const partners = await prisma.carPartner.findMany();
  console.log('Found', partners.length, 'partners');
  
  if (partners.length === 0) return;
  const p = partners[0];
  console.log('Using partner:', p.email || p.phoneNum);

  const cars = await prisma.car.findMany({ where: { partnerId: p.id } });
  console.log('Partner has', cars.length, 'cars');
  
  for (const c of cars) {
     const bookings = await prisma.booking.findMany({ where: { carId: c.id }});
     console.log(`Car: ${c.name} has ${bookings.length} bookings`);
     bookings.forEach(b => console.log(`  - Booking ${b.id}: status ${b.status}, created at ${b.createdAt}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
