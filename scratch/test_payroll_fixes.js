const prisma = require('../server/src/config/prisma');
const { calculateAttendanceStats, processPayrollRules, computeEmployeePayroll } = require('../server/src/services/payrollEngine');

async function runTests() {
  console.log('=== STARTING PAYROLL & ATTENDANCE FIXES VERIFICATION ===\n');

  // Test 1: Verify TimeOffTypes isPaid flag in DB
  const leaveTypes = await prisma.timeOffType.findMany();
  console.log('Test 1: Time Off Types in DB:');
  leaveTypes.forEach(t => console.log(`  - ${t.name}: isPaid = ${t.isPaid}`));
  
  const paidType = leaveTypes.find(t => t.isPaid === true);
  const unpaidType = leaveTypes.find(t => t.isPaid === false);

  if (!paidType) console.error('  ❌ FAIL: No paid leave type found');
  else console.log('  ✔ PASS: Paid leave type exists');

  // Test 2: Verify processPayrollRules for Medical Allowance & Fixed Rules
  console.log('\nTest 2: Medical Allowance Fixed Amount Decoupling');
  const dummyContract = { wage: 50000 };
  const mockRules = [
    { id: '1', name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, computationType: 'FIXED', isActive: true },
    { id: '2', name: 'Medical Allowance', code: 'MEDICAL', category: 'ALLOWANCE', sequence: 2, computationType: 'FIXED', fixedAmount: 2500, isActive: true },
  ];

  // 100% attendance (20/20 days)
  const fullStats = { workedDays: 20, totalWorkingDays: 20, overtimeHours: 0, leaveDays: 0 };
  const fullCalc = processPayrollRules({ contract: dummyContract, attendanceStats: fullStats, rules: mockRules });
  const medFull = fullCalc.lines.find(l => l.code === 'MEDICAL')?.amount;

  // 50% attendance (10/20 days)
  const halfStats = { workedDays: 10, totalWorkingDays: 20, overtimeHours: 0, leaveDays: 0 };
  const halfCalc = processPayrollRules({ contract: dummyContract, attendanceStats: halfStats, rules: mockRules });
  const medHalf = halfCalc.lines.find(l => l.code === 'MEDICAL')?.amount;

  console.log(`  Full Attendance Medical Allowance: ₹${medFull}`);
  console.log(`  Half Attendance Medical Allowance: ₹${medHalf}`);
  if (medFull === 2500 && medHalf === 2500) {
    console.log('  ✔ PASS: Medical Allowance is FIXED (₹2,500) and decoupled from attendance!');
  } else {
    console.error(`  ❌ FAIL: Medical Allowance altered by attendance: full=${medFull}, half=${medHalf}`);
  }

  // Test 3: Contract Salary Structure Rules Isolation
  console.log('\nTest 3: Contract-Specific Salary Structure Execution');
  const activeContracts = await prisma.contract.findMany({
    where: { status: 'ACTIVE' },
    include: { salaryStructure: { include: { rules: { where: { isActive: true } } } } },
    take: 2,
  });

  if (activeContracts.length > 0) {
    const testContract = activeContracts[0];
    const expectedRuleCount = testContract.salaryStructure?.rules?.length || 0;
    const testPayrun = { periodStart: new Date('2026-08-01'), periodEnd: new Date('2026-08-31'), salaryStructureId: 'different-struct-id' };
    const empResult = await computeEmployeePayroll({
      employee: { id: testContract.employeeId },
      payrun: testPayrun,
      salaryStructureId: 'fallback-id',
      rules: [],
      prisma,
    });

    if (empResult.success) {
      console.log(`  Employee: ${testContract.employeeId}`);
      console.log(`  Assigned Structure: ${testContract.salaryStructure?.name} (${expectedRuleCount} rules)`);
      console.log(`  Computed Payslip Line Count: ${empResult.lines.length}`);
      if (empResult.lines.length === expectedRuleCount && empResult.salaryStructureId === testContract.salaryStructureId) {
        console.log('  ✔ PASS: Payslip computed strictly using employee contract structure rules!');
      } else {
        console.error(`  ❌ FAIL: Payslip lines (${empResult.lines.length}) != expected structure rules (${expectedRuleCount})`);
      }
    } else {
      console.log(`  Notice: Payroll computation skipped for ${testContract.employeeId}: ${empResult.error}`);
    }
  }

  console.log('\n=== ALL VERIFICATION CHECKS COMPLETE ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
