const prisma = require('../src/config/prisma');

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      attendanceLocationId: true,
      attendanceLocation: { select: { id: true, name: true } },
      user: { select: { id: true, email: true, role: true } }
    }
  });
  console.log('EMPLOYEES IN DB:');
  console.log(JSON.stringify(employees, null, 2));
  await prisma.$disconnect();
}

main();
