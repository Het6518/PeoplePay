const prisma = require('../src/config/prisma');

async function main() {
  const locations = await prisma.attendanceLocation.findMany({
    include: {
      _count: { select: { employees: true } }
    }
  });
  console.log('LOCATIONS IN DB:');
  console.log(JSON.stringify(locations, null, 2));
  await prisma.$disconnect();
}

main();
