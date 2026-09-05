const prisma = require('../server/src/config/prisma');

async function testStructureCreation() {
  console.log('Testing Salary Structure creation for HR_PAYROLL_MANAGER...');

  const newStruct = await prisma.salaryStructure.create({
    data: {
      name: `Test Structure ${Date.now()}`,
      description: 'Created by automated verification test',
      isActive: true,
    },
  });

  console.log('✔ Successfully created Salary Structure in DB:', newStruct.id, newStruct.name);

  // Clean up test record
  await prisma.salaryStructure.delete({ where: { id: newStruct.id } });
  console.log('✔ Test structure cleaned up.');

  process.exit(0);
}

testStructureCreation().catch((err) => {
  console.error('❌ Error creating structure:', err);
  process.exit(1);
});
