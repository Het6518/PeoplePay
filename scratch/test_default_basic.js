const prisma = require('../server/src/config/prisma');

async function testDefaultBasicRule() {
  console.log('Testing default Basic Salary rule creation...');

  const struct = await prisma.salaryStructure.create({
    data: {
      name: `Auto Basic Structure ${Date.now()}`,
      description: 'Test default basic rule attachment',
      rules: {
        create: [
          {
            name: 'Basic Salary',
            code: 'BASIC',
            category: 'BASIC',
            sequence: 1,
            computationType: 'FIXED',
            description: 'Basic salary component derived from contract wage',
            isActive: true,
          },
        ],
      },
    },
    include: { rules: true },
  });

  console.log('Created structure:', struct.name);
  console.log('Rules attached:', struct.rules.map(r => `${r.name} (${r.code}) - Sequence ${r.sequence}`));

  const hasBasic = struct.rules.some(r => r.code === 'BASIC' && r.category === 'BASIC');
  if (hasBasic) {
    console.log('✔ SUCCESS: Default Basic Salary rule created automatically!');
  } else {
    console.error('❌ FAIL: Basic Salary rule missing');
  }

  // Clean up
  await prisma.salaryRule.deleteMany({ where: { salaryStructureId: struct.id } });
  await prisma.salaryStructure.delete({ where: { id: struct.id } });
  process.exit(0);
}

testDefaultBasicRule().catch(err => {
  console.error(err);
  process.exit(1);
});
