const prisma = require('../src/config/prisma');

async function testQuery() {
  console.log('Testing Prisma Client query with attendanceLocation...');
  try {
    const locations = await prisma.attendanceLocation.findMany();
    console.log('✅ Found attendance locations:', locations.length);

    const employees = await prisma.employee.findMany({
      take: 1,
      include: {
        attendanceLocation: true,
      },
    });
    console.log('✅ Query succeeded! Employee attendanceLocation relation is working properly.');
    console.log('Sample Employee:', employees[0] ? employees[0].firstName : 'No employees in DB');
  } catch (err) {
    console.error('❌ Error executing Prisma query:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
