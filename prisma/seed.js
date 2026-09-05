/**
 * PeoplePay360 Database Seed
 *
 * Creates realistic demo data for all modules.
 * Demonstrates: period-based contract detection, payroll calculation,
 * anomaly detection, leave management, and historical data for dashboard.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const prisma = new PrismaClient();

const HASH_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, HASH_ROUNDS);
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Returns a date within the given month
function dateInMonth(year, month, day) {
  return new Date(year, month - 1, day);
}

// Working days in a month (approximate)
function workingDaysInMonth(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

async function seed() {
  console.log('🌱 Starting PeoplePay360 seed...\n');

  // ============================================================
  // CLEANUP (order matters due to FK constraints)
  // ============================================================
  console.log('🧹 Cleaning existing data...');
  await prisma.attendanceLocationAudit.deleteMany();
  await prisma.attendanceLocation.deleteMany();
  await prisma.payslipLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrun.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.timeOffAllocation.deleteMany();
  await prisma.timeOffType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.workingScheduleDay.deleteMany();
  await prisma.workingSchedule.deleteMany();
  console.log('✅ Cleanup complete\n');

  // ============================================================
  // ATTENDANCE LOCATIONS
  // ============================================================
  console.log('📍 Creating geofenced attendance locations...');
  const headOffice = await prisma.attendanceLocation.create({
    data: {
      name: 'Head Office',
      latitude: 23.0225,
      longitude: 72.5714,
      radiusMeters: 500,
      isActive: true,
    },
  });

  const branchOffice = await prisma.attendanceLocation.create({
    data: {
      name: 'Branch Office',
      latitude: 19.0760,
      longitude: 72.8777,
      radiusMeters: 300,
      isActive: true,
    },
  });
  console.log('✅ 2 attendance locations created\n');

  // ============================================================
  // DEPARTMENTS
  // ============================================================
  console.log('📁 Creating departments...');
  const [engDept, financeDept, hrDept, salesDept] = await Promise.all([
    prisma.department.create({ data: { name: 'Engineering', description: 'Software development and architecture' } }),
    prisma.department.create({ data: { name: 'Finance', description: 'Financial planning and accounting' } }),
    prisma.department.create({ data: { name: 'Human Resources', description: 'HR operations and people management' } }),
    prisma.department.create({ data: { name: 'Sales', description: 'Revenue generation and customer success' } }),
  ]);
  console.log('✅ 4 departments created\n');

  // ============================================================
  // WORKING SCHEDULES
  // ============================================================
  console.log('📅 Creating working schedules...');
  const stdScheduleDays = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
    { dayOfWeek: 6, startTime: "", endTime: "", breakMinutes: 0, isWorkday: false },
    { dayOfWeek: 0, startTime: "", endTime: "", breakMinutes: 0, isWorkday: false },
  ];

  const standardSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Standard 40hr/week',
      type: 'FIXED',
      weeklyHours: 40,
      days: { create: stdScheduleDays },
    },
  });

  const flexScheduleDays = [
    { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', breakMinutes: 30, isWorkday: true },
    { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', breakMinutes: 30, isWorkday: true },
    { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', breakMinutes: 30, isWorkday: true },
    { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', breakMinutes: 30, isWorkday: true },
    { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', breakMinutes: 0, isWorkday: true },
    { dayOfWeek: 6, startTime: "", endTime: "", breakMinutes: 0, isWorkday: false },
    { dayOfWeek: 0, startTime: "", endTime: "", breakMinutes: 0, isWorkday: false },
  ];

  const flexSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Flexible 37.5hr/week',
      type: 'FLEXIBLE',
      weeklyHours: 37.5,
      days: { create: flexScheduleDays },
    },
  });
  console.log('✅ 2 schedules created\n');

  // ============================================================
  // SALARY STRUCTURES & RULES
  // ============================================================
  console.log('💰 Creating salary structures and rules...');

  const regularStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Salary',
      description: 'Standard monthly salary structure for all full-time employees',
      isActive: true,
    },
  });

  // Rules: ordered by sequence, execute one by one
  // BASIC: prorated from contract wage (handled by engine when category=BASIC and type=FIXED)
  // HRA: 20% of BASIC
  // TRANSPORT: fixed ₹2,000
  // SPECIAL_ALLOWANCE: 10% of BASIC
  // GROSS: BASIC + HRA + TRANSPORT + SPECIAL_ALLOWANCE
  // PF: 12% of BASIC
  // PT: Professional Tax ₹200
  // TDS: 10% of (GROSS - 50000*12) / 12 — simplified as formula
  // NET: GROSS - PF - PT - TDS

  const regularRules = [
    {
      name: 'Basic Salary',
      code: 'BASIC',
      category: 'BASIC',
      sequence: 1,
      computationType: 'FIXED',
      fixedAmount: 0, // Engine uses contract.wage prorated
      description: 'Basic salary prorated from contract wage based on worked days',
    },
    {
      name: 'House Rent Allowance',
      code: 'HRA',
      category: 'ALLOWANCE',
      sequence: 2,
      computationType: 'PERCENTAGE',
      percentage: 20,
      percentageBase: 'BASIC',
      description: '20% of Basic Salary',
    },
    {
      name: 'Transport Allowance',
      code: 'TRANSPORT',
      category: 'ALLOWANCE',
      sequence: 3,
      computationType: 'FIXED',
      fixedAmount: 2000,
      description: 'Fixed monthly transport allowance',
    },
    {
      name: 'Special Allowance',
      code: 'SPECIAL',
      category: 'ALLOWANCE',
      sequence: 4,
      computationType: 'PERCENTAGE',
      percentage: 10,
      percentageBase: 'BASIC',
      description: '10% of Basic Salary',
    },
    {
      name: 'Gross Salary',
      code: 'GROSS',
      category: 'GROSS',
      sequence: 5,
      computationType: 'FORMULA',
      formula: 'BASIC + HRA + TRANSPORT + SPECIAL',
      description: 'Total of all earnings',
    },
    {
      name: 'Provident Fund',
      code: 'PF',
      category: 'DEDUCTION',
      sequence: 6,
      computationType: 'PERCENTAGE',
      percentage: 12,
      percentageBase: 'BASIC',
      description: "Employee's PF contribution (12% of Basic)",
    },
    {
      name: 'Professional Tax',
      code: 'PT',
      category: 'DEDUCTION',
      sequence: 7,
      computationType: 'FIXED',
      fixedAmount: 200,
      description: 'Professional tax as per state law',
    },
    {
      name: 'Income Tax (TDS)',
      code: 'TDS',
      category: 'DEDUCTION',
      sequence: 8,
      computationType: 'FORMULA',
      formula: 'GROSS * 0.1 - 4166.67', // Simplified: ~10% tax with basic exemption
      description: 'Monthly TDS based on annual income tax slab (simplified)',
    },
    {
      name: 'Net Salary',
      code: 'NET',
      category: 'NET',
      sequence: 9,
      computationType: 'FORMULA',
      formula: 'GROSS - PF - PT - TDS',
      description: 'Take-home pay after all deductions',
    },
  ];

  await prisma.salaryRule.createMany({
    data: regularRules.map((r) => ({
      ...r,
      salaryStructureId: regularStructure.id,
    })),
  });

  // Executive structure for senior employees
  const execStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Executive Salary',
      description: 'Enhanced salary structure for senior management',
      isActive: true,
    },
  });

  await prisma.salaryRule.createMany({
    data: [
      { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, computationType: 'FIXED', fixedAmount: 0 },
      { name: 'HRA', code: 'HRA', category: 'ALLOWANCE', sequence: 2, computationType: 'PERCENTAGE', percentage: 25, percentageBase: 'BASIC' },
      { name: 'Transport', code: 'TRANSPORT', category: 'ALLOWANCE', sequence: 3, computationType: 'FIXED', fixedAmount: 5000 },
      { name: 'Medical Allowance', code: 'MEDICAL', category: 'ALLOWANCE', sequence: 4, computationType: 'FIXED', fixedAmount: 2500 },
      { name: 'Performance Bonus', code: 'BONUS', category: 'ALLOWANCE', sequence: 5, computationType: 'PERCENTAGE', percentage: 15, percentageBase: 'BASIC' },
      { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 6, computationType: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT + MEDICAL + BONUS' },
      { name: 'PF', code: 'PF', category: 'DEDUCTION', sequence: 7, computationType: 'PERCENTAGE', percentage: 12, percentageBase: 'BASIC' },
      { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 8, computationType: 'FIXED', fixedAmount: 200 },
      { name: 'TDS', code: 'TDS', category: 'DEDUCTION', sequence: 9, computationType: 'FORMULA', formula: 'GROSS * 0.15 - 4166.67' },
      { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 10, computationType: 'FORMULA', formula: 'GROSS - PF - PT - TDS' },
    ].map((r) => ({ ...r, salaryStructureId: execStructure.id })),
  });

  console.log('✅ 2 salary structures + 19 rules created\n');

  // ============================================================
  // DEMO USERS (5 roles)
  // ============================================================
  console.log('👤 Creating demo users...');

  const userCredentials = [
    { email: 'admin@peoplepay360.com', password: 'Admin@123', role: 'ADMIN' },
    { email: 'payrollmanager@peoplepay360.com', password: 'Pmgr@1234', role: 'HR_PAYROLL_MANAGER' },
    { email: 'payrolluser@peoplepay360.com', password: 'Pay@12345', role: 'HR_PAYROLL_USER' },
    { email: 'hr@peoplepay360.com', password: 'Hr@123456', role: 'HR_MANAGER' },
    { email: 'employee@peoplepay360.com', password: 'Emp@12345', role: 'EMPLOYEE' },
  ];

  const users = {};
  for (const cred of userCredentials) {
    users[cred.role] = await prisma.user.create({
      data: {
        email: cred.email,
        passwordHash: await hashPassword(cred.password),
        role: cred.role,
      },
    });
  }
  console.log('✅ 5 demo users created\n');

  // ============================================================
  // EMPLOYEES (15 employees across all departments)
  // ============================================================
  console.log('👥 Creating employees...');

  // HR Manager employee (linked to hr user)
  const hrManager = await prisma.employee.create({
    data: {
      employeeCode: 'EMP001',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@peoplepay360.com',
      phone: '+91-9876543210',
      joiningDate: new Date('2022-01-15'),
      departmentId: hrDept.id,
      jobPosition: 'HR Manager',
      employeeType: 'FULL_TIME',
      status: 'ACTIVE',
      userId: users['HR_MANAGER'].id,
      workingScheduleId: standardSchedule.id,
      bankAccountName: 'Priya Sharma',
      bankAccountNumber: '1234567890',
      bankName: 'HDFC Bank',
      panNumber: 'ABCDE1234F',
    },
  });

  // Payroll Manager
  const payrollManager = await prisma.employee.create({
    data: {
      employeeCode: 'EMP002',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'rajesh.kumar@peoplepay360.com',
      phone: '+91-9876543211',
      joiningDate: new Date('2021-06-01'),
      departmentId: financeDept.id,
      jobPosition: 'Payroll Manager',
      employeeType: 'FULL_TIME',
      status: 'ACTIVE',
      userId: users['HR_PAYROLL_MANAGER'].id,
      workingScheduleId: standardSchedule.id,
      bankAccountName: 'Rajesh Kumar',
      bankAccountNumber: '2345678901',
      bankName: 'SBI',
      panNumber: 'FGHIJ5678K',
    },
  });

  // KEY DEMO EMPLOYEE: Het Patel (contract change scenario)
  const hetPatel = await prisma.employee.create({
    data: {
      employeeCode: 'EMP003',
      firstName: 'Het',
      lastName: 'Patel',
      email: 'het.patel@peoplepay360.com',
      phone: '+91-9876543212',
      joiningDate: new Date('2025-01-01'),
      departmentId: engDept.id,
      jobPosition: 'Senior Software Engineer',
      employeeType: 'FULL_TIME',
      status: 'ACTIVE',
      workingScheduleId: standardSchedule.id,
      bankAccountName: 'Het Patel',
      bankAccountNumber: '3456789012',
      bankName: 'ICICI Bank',
      panNumber: 'LMNOP9012Q',
    },
  });

  // Employee user linked to a real employee
  const empUser = await prisma.employee.create({
    data: {
      employeeCode: 'EMP004',
      firstName: 'Ananya',
      lastName: 'Singh',
      email: 'employee@peoplepay360.com',
      phone: '+91-9876543213',
      joiningDate: new Date('2023-03-01'),
      departmentId: salesDept.id,
      jobPosition: 'Sales Executive',
      employeeType: 'FULL_TIME',
      status: 'ACTIVE',
      userId: users['EMPLOYEE'].id,
      workingScheduleId: standardSchedule.id,
      bankAccountName: 'Ananya Singh',
      bankAccountNumber: '4567890123',
      bankName: 'Axis Bank',
      panNumber: 'RSTUV3456W',
    },
  });

  // Link admin user to an employee
  await prisma.employee.create({
    data: {
      employeeCode: 'EMP005',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@peoplepay360.com',
      phone: '+91-9000000001',
      joiningDate: new Date('2020-01-01'),
      departmentId: hrDept.id,
      jobPosition: 'System Administrator',
      employeeType: 'FULL_TIME',
      status: 'ACTIVE',
      userId: users['ADMIN'].id,
      workingScheduleId: standardSchedule.id,
      bankAccountName: 'Admin User',
      bankAccountNumber: '9999999999',
      bankName: 'HDFC Bank',
      panNumber: 'ADMIN0000X',
    },
  });

  // More employees
  const engineeringEmployees = [
    { code: 'EMP006', first: 'Arjun', last: 'Mehta', position: 'Software Engineer', email: 'arjun.mehta@peoplepay360.com' },
    { code: 'EMP007', first: 'Kavitha', last: 'Reddy', position: 'QA Engineer', email: 'kavitha.reddy@peoplepay360.com' },
    { code: 'EMP008', first: 'Rohan', last: 'Desai', position: 'DevOps Engineer', email: 'rohan.desai@peoplepay360.com' },
    { code: 'EMP009', first: 'Meera', last: 'Krishnan', position: 'Full Stack Developer', email: 'meera.krishnan@peoplepay360.com' },
  ];

  const financeEmployees = [
    { code: 'EMP010', first: 'Suresh', last: 'Iyer', position: 'Senior Accountant', email: 'suresh.iyer@peoplepay360.com' },
    { code: 'EMP011', first: 'Lakshmi', last: 'Nair', position: 'Finance Analyst', email: 'lakshmi.nair@peoplepay360.com' },
  ];

  const salesEmployees = [
    { code: 'EMP012', first: 'Vijay', last: 'Gupta', position: 'Sales Manager', email: 'vijay.gupta@peoplepay360.com' },
    { code: 'EMP013', first: 'Pooja', last: 'Joshi', position: 'Business Development', email: 'pooja.joshi@peoplepay360.com' },
    { code: 'EMP014', first: 'Rahul', last: 'Verma', position: 'Account Manager', email: 'rahul.verma@peoplepay360.com' },
  ];

  const hrEmployees = [
    { code: 'EMP015', first: 'Deepa', last: 'Pillai', position: 'HR Executive', email: 'deepa.pillai@peoplepay360.com' },
  ];

  const allEmployeeData = [
    ...engineeringEmployees.map((e) => ({ ...e, deptId: engDept.id, managerId: hetPatel.id })),
    ...financeEmployees.map((e) => ({ ...e, deptId: financeDept.id, managerId: payrollManager.id })),
    ...salesEmployees.map((e) => ({ ...e, deptId: salesDept.id, managerId: null })),
    ...hrEmployees.map((e) => ({ ...e, deptId: hrDept.id, managerId: hrManager.id })),
  ];

  const additionalEmployees = [];
  for (const emp of allEmployeeData) {
    const created = await prisma.employee.create({
      data: {
        employeeCode: emp.code,
        firstName: emp.first,
        lastName: emp.last,
        email: emp.email,
        phone: `+91-${randomBetween(8000000000, 9999999999)}`,
        joiningDate: new Date(`202${randomBetween(1, 4)}-0${randomBetween(1, 9)}-01`),
        departmentId: emp.deptId,
        managerId: emp.managerId,
        jobPosition: emp.position,
        employeeType: 'FULL_TIME',
        status: 'ACTIVE',
        workingScheduleId: standardSchedule.id,
        bankAccountName: `${emp.first} ${emp.last}`,
        bankAccountNumber: `${randomBetween(1000000000, 9999999999)}`,
        bankName: ['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Kotak Bank'][randomBetween(0, 4)],
        panNumber: `${emp.code}PANX`,
      },
    });
    additionalEmployees.push(created);
  }

  // Payroll user employee
  const payrollUserEmp = await prisma.employee.create({
    data: {
      employeeCode: 'EMP016',
      firstName: 'Nisha',
      lastName: 'Bhatt',
      email: 'payrolluser@peoplepay360.com',
      phone: '+91-9000000002',
      joiningDate: new Date('2022-07-01'),
      departmentId: financeDept.id,
      jobPosition: 'Payroll Executive',
      employeeType: 'FULL_TIME',
      status: 'ACTIVE',
      userId: users['HR_PAYROLL_USER'].id,
      workingScheduleId: standardSchedule.id,
      bankAccountName: 'Nisha Bhatt',
      bankAccountNumber: '5678901234',
      bankName: 'Kotak Bank',
    },
  });

  const allEmployees = [
    hrManager, payrollManager, hetPatel, empUser,
    ...additionalEmployees, payrollUserEmp,
  ];

  console.log(`✅ ${allEmployees.length + 1} employees created\n`);

  // ============================================================
  // CONTRACTS
  // ============================================================
  console.log('📋 Creating contracts...');

  // HET PATEL: TWO HISTORICAL CONTRACTS (key demo scenario)
  // Contract 1: January - June 2026 at ₹50,000
  await prisma.contract.create({
    data: {
      employeeId: hetPatel.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      departmentId: engDept.id,
      position: 'Senior Software Engineer',
      wage: 50000,
      salaryStructureId: regularStructure.id,
      status: 'EXPIRED',
      notes: 'Initial contract - period January to June 2026',
    },
  });

  // Contract 2: July - December 2026 at ₹65,000 (ACTIVE - September Payrun must use THIS)
  const hetActiveContract = await prisma.contract.create({
    data: {
      employeeId: hetPatel.id,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31'),
      departmentId: engDept.id,
      position: 'Senior Software Engineer',
      wage: 65000,
      salaryStructureId: regularStructure.id,
      status: 'ACTIVE',
      notes: 'Revised contract with 30% salary increment from July 2026',
    },
  });

  // Contracts for all other employees
  const contractWages = {
    'EMP001': 75000, // HR Manager
    'EMP002': 120000, // Payroll Manager - Executive
    'EMP004': 45000, // Sales Exec
    'EMP005': 100000, // Admin
    'EMP006': 55000, // Software Engineer
    'EMP007': 48000, // QA Engineer
    'EMP008': 60000, // DevOps
    'EMP009': 52000, // Full Stack
    'EMP010': 65000, // Sr Accountant
    'EMP011': 50000, // Finance Analyst
    'EMP012': 80000, // Sales Manager
    'EMP013': 55000, // BD
    'EMP014': 60000, // Account Manager
    'EMP015': 40000, // HR Exec
    'EMP016': 45000, // Payroll Exec
  };

  for (const employee of allEmployees) {
    if (employee.employeeCode === 'EMP003') continue; // Skip Het Patel (already created)
    const wage = contractWages[employee.employeeCode] || 50000;
    const structure = ['EMP002', 'EMP012'].includes(employee.employeeCode) ? execStructure : regularStructure;

    await prisma.contract.create({
      data: {
        employeeId: employee.id,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-12-31'),
        departmentId: employee.departmentId,
        position: employee.jobPosition,
        wage,
        salaryStructureId: structure.id,
        status: 'ACTIVE',
      },
    });
  }

  console.log('✅ Contracts created\n');

  // ============================================================
  // TIME OFF TYPES
  // ============================================================
  console.log('🌴 Creating time off types...');

  const [paidLeave, sickLeave, casualLeave, maternityLeave] = await Promise.all([
    prisma.timeOffType.create({
      data: {
        name: 'Paid Leave',
        unit: 'DAYS',
        requiresAllocation: true,
        requiresApproval: true,
        payrollIntegration: false,
        description: 'Annual paid leave entitlement',
        color: '#6366f1',
      },
    }),
    prisma.timeOffType.create({
      data: {
        name: 'Sick Leave',
        unit: 'DAYS',
        requiresAllocation: true,
        requiresApproval: false,
        payrollIntegration: false,
        description: 'Medical leave for illness',
        color: '#ef4444',
      },
    }),
    prisma.timeOffType.create({
      data: {
        name: 'Casual Leave',
        unit: 'DAYS',
        requiresAllocation: true,
        requiresApproval: true,
        payrollIntegration: false,
        description: 'Short-notice casual leave',
        color: '#f59e0b',
      },
    }),
    prisma.timeOffType.create({
      data: {
        name: 'Maternity Leave',
        unit: 'DAYS',
        requiresAllocation: false,
        requiresApproval: true,
        payrollIntegration: false,
        description: '26 weeks maternity leave as per law',
        color: '#ec4899',
      },
    }),
  ]);

  console.log('✅ 4 time off types created\n');

  // ============================================================
  // TIME OFF ALLOCATIONS
  // ============================================================
  console.log('📊 Creating leave allocations...');

  const approver = hrManager;
  const validFrom = new Date('2026-01-01');
  const validTo = new Date('2026-12-31');

  for (const employee of allEmployees) {
    await prisma.timeOffAllocation.create({
      data: {
        employeeId: employee.id,
        timeOffTypeId: paidLeave.id,
        allocatedAmount: 21,
        takenAmount: randomBetween(0, 8),
        remainingAmount: 21 - randomBetween(0, 8),
        validFrom,
        validTo,
        status: 'APPROVED',
        approvedById: approver.id,
        approvedByName: `${approver.firstName} ${approver.lastName}`,
        approvedAt: new Date('2026-01-02'),
      },
    });

    await prisma.timeOffAllocation.create({
      data: {
        employeeId: employee.id,
        timeOffTypeId: sickLeave.id,
        allocatedAmount: 7,
        takenAmount: randomBetween(0, 3),
        remainingAmount: 7 - randomBetween(0, 3),
        validFrom,
        validTo,
        status: 'APPROVED',
        approvedById: approver.id,
        approvedByName: `${approver.firstName} ${approver.lastName}`,
        approvedAt: new Date('2026-01-02'),
      },
    });

    await prisma.timeOffAllocation.create({
      data: {
        employeeId: employee.id,
        timeOffTypeId: casualLeave.id,
        allocatedAmount: 12,
        takenAmount: randomBetween(0, 5),
        remainingAmount: 12 - randomBetween(0, 5),
        validFrom,
        validTo,
        status: 'APPROVED',
        approvedById: approver.id,
        approvedByName: `${approver.firstName} ${approver.lastName}`,
        approvedAt: new Date('2026-01-02'),
      },
    });
  }

  // A few pending allocations for dashboard alerts
  await prisma.timeOffAllocation.create({
    data: {
      employeeId: additionalEmployees[0].id,
      timeOffTypeId: paidLeave.id,
      allocatedAmount: 5,
      remainingAmount: 5,
      validFrom: new Date('2026-09-01'),
      validTo: new Date('2026-12-31'),
      status: 'PENDING',
    },
  });

  console.log('✅ Leave allocations created\n');

  // ============================================================
  // TIME OFF REQUESTS
  // ============================================================
  console.log('📝 Creating leave requests...');

  // Approved requests in past months
  await prisma.timeOffRequest.create({
    data: {
      employeeId: hetPatel.id,
      timeOffTypeId: paidLeave.id,
      startDate: new Date('2026-07-14'),
      endDate: new Date('2026-07-18'),
      duration: 5,
      reason: 'Family vacation',
      status: 'APPROVED',
      approvedById: hrManager.id,
      approvedByName: `${hrManager.firstName} ${hrManager.lastName}`,
      approvedAt: new Date('2026-07-10'),
    },
  });

  await prisma.timeOffRequest.create({
    data: {
      employeeId: additionalEmployees[0].id,
      timeOffTypeId: sickLeave.id,
      startDate: new Date('2026-08-05'),
      endDate: new Date('2026-08-06'),
      duration: 2,
      reason: 'Not feeling well',
      status: 'APPROVED',
      approvedById: hrManager.id,
      approvedByName: `${hrManager.firstName} ${hrManager.lastName}`,
      approvedAt: new Date('2026-08-04'),
    },
  });

  // PENDING requests for dashboard alert
  await prisma.timeOffRequest.create({
    data: {
      employeeId: empUser.id,
      timeOffTypeId: casualLeave.id,
      startDate: new Date('2026-09-10'),
      endDate: new Date('2026-09-11'),
      duration: 2,
      reason: 'Personal work',
      status: 'PENDING',
    },
  });

  await prisma.timeOffRequest.create({
    data: {
      employeeId: additionalEmployees[3].id,
      timeOffTypeId: paidLeave.id,
      startDate: new Date('2026-09-22'),
      endDate: new Date('2026-09-24'),
      duration: 3,
      reason: 'Medical appointment',
      status: 'PENDING',
    },
  });

  console.log('✅ Leave requests created\n');

  // ============================================================
  // ATTENDANCE (for current month - Sep 2026)
  // ============================================================
  console.log('⏰ Creating attendance records...');

  const attendanceStatuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'PRESENT', 'OVERTIME', 'PRESENT', 'MISSING_CHECKOUT'];

  // September 2026 attendance for all employees
  // Days 1-4 (before "today" Sep 5)
  const attendanceDays = [1, 2, 3, 4];

  for (const employee of allEmployees) {
    for (const day of attendanceDays) {
      const date = new Date(2026, 8, day); // Sep is month 8 (0-indexed)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      const baseCheckIn = new Date(2026, 8, day, 9, randomBetween(0, 30), 0);
      const isLate = baseCheckIn.getHours() === 9 && baseCheckIn.getMinutes() > 10;
      const isOvertime = employee.employeeCode === 'EMP006' && day === 3; // Arjun works overtime on day 3

      const checkOut = new Date(2026, 8, day, isOvertime ? 20 : 18, randomBetween(0, 30), 0);
      const workedHours = (checkOut - baseCheckIn) / (1000 * 60 * 60) - 1; // minus 1hr break

      let status = 'PRESENT';
      if (isLate && !isOvertime) status = 'LATE';
      if (isOvertime) status = 'OVERTIME';

      // Rahul Verma (EMP014) has a missing checkout on Sep 2
      if (employee.employeeCode === 'EMP014' && day === 2) {
        await prisma.attendance.create({
          data: {
            employeeId: employee.id,
            date,
            checkIn: new Date(2026, 8, 2, 9, 5, 0),
            checkOut: null,
            workedHours: null,
            status: 'MISSING_CHECKOUT',
          },
        });
        continue;
      }

      await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date,
          checkIn: baseCheckIn,
          checkOut,
          workedHours: Math.round(workedHours * 100) / 100,
          status,
        },
      });
    }
  }

  // Add a manual correction record
  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: additionalEmployees[0].id, date: new Date(2026, 8, 1) } },
    update: {
      status: 'MANUAL_CORRECTION',
      isManualCorrection: true,
      correctedByName: `${hrManager.firstName} ${hrManager.lastName}`,
      correctionReason: 'System error - corrected check-in time from access log',
      correctedAt: new Date(2026, 8, 2),
    },
    create: {
      employeeId: additionalEmployees[0].id,
      date: new Date(2026, 8, 1),
      checkIn: new Date(2026, 8, 1, 9, 0, 0),
      checkOut: new Date(2026, 8, 1, 18, 0, 0),
      workedHours: 8,
      status: 'MANUAL_CORRECTION',
      isManualCorrection: true,
      correctedByName: `${hrManager.firstName} ${hrManager.lastName}`,
      correctionReason: 'System error - corrected check-in time from access log',
      correctedAt: new Date(2026, 8, 2),
    },
  });

  console.log('✅ Attendance records created\n');

  // ============================================================
  // HISTORICAL PAYRUNS (Jan-Aug 2026 for trend charts)
  // ============================================================
  console.log('💼 Creating historical payruns...');

  const employees = allEmployees.slice(0, 10); // Use 10 employees for historical
  
  // Process Jan through Aug 2026
  for (let month = 1; month <= 8; month++) {
    const year = 2026;
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Last day of month
    const monthName = periodStart.toLocaleString('en-IN', { month: 'long' });

    const payrun = await prisma.payrun.create({
      data: {
        name: `Payroll - ${monthName} ${year}`,
        periodStart,
        periodEnd,
        salaryStructureId: regularStructure.id,
        status: 'PAID',
        createdById: payrollManager.id,
        computedAt: new Date(year, month, 28),
        validatedAt: new Date(year, month, 29),
        finalizedAt: new Date(year, month, 30),
        paidAt: new Date(year, month, 30),
      },
    });

    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    for (const employee of employees) {
      // Find the applicable contract for this month
      const contract = await prisma.contract.findFirst({
        where: {
          employeeId: employee.id,
          status: { in: ['ACTIVE', 'EXPIRED'] },
          startDate: { lte: periodEnd },
          OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
        },
        include: { salaryStructure: { include: { rules: { where: { isActive: true }, orderBy: { sequence: 'asc' } } } } },
      });

      if (!contract) continue;

      const workingDays = workingDaysInMonth(year, month);
      const workedDays = workingDays - randomBetween(0, 2); // Random absences
      const wage = contract.wage;

      // Simple calculation for historical data
      const basic = Math.round((wage * workedDays / workingDays) * 100) / 100;
      const hra = Math.round(basic * 0.20 * 100) / 100;
      const transport = 2000;
      const special = Math.round(basic * 0.10 * 100) / 100;
      const gross = basic + hra + transport + special;
      const pf = Math.round(basic * 0.12 * 100) / 100;
      const pt = 200;
      const tds = Math.max(0, Math.round((gross * 0.1 - 4166.67) * 100) / 100);
      const net = Math.round((gross - pf - pt - tds) * 100) / 100;

      totalGross += gross;
      totalDeductions += pf + pt + tds;
      totalNet += net;

      const structure = contract.salaryStructure;
      const rules = structure?.rules || [];

      const payslip = await prisma.payslip.create({
        data: {
          payrunId: payrun.id,
          employeeId: employee.id,
          contractId: contract.id,
          salaryStructureId: contract.salaryStructureId,
          periodStart,
          periodEnd,
          workedDays,
          totalWorkingDays: workingDays,
          leaveDays: workingDays - workedDays,
          overtimeHours: randomBetween(0, 8),
          status: 'PAID',
          grossSalary: gross,
          totalDeductions: pf + pt + tds,
          netSalary: net,
          hasWarnings: false,
          hasErrors: false,
        },
      });

      // Create payslip lines
      const lines = [
        { code: 'BASIC', name: 'Basic Salary', category: 'BASIC', sequence: 1, amount: basic },
        { code: 'HRA', name: 'House Rent Allowance', category: 'ALLOWANCE', sequence: 2, amount: hra },
        { code: 'TRANSPORT', name: 'Transport Allowance', category: 'ALLOWANCE', sequence: 3, amount: transport },
        { code: 'SPECIAL', name: 'Special Allowance', category: 'ALLOWANCE', sequence: 4, amount: special },
        { code: 'GROSS', name: 'Gross Salary', category: 'GROSS', sequence: 5, amount: gross },
        { code: 'PF', name: 'Provident Fund', category: 'DEDUCTION', sequence: 6, amount: pf },
        { code: 'PT', name: 'Professional Tax', category: 'DEDUCTION', sequence: 7, amount: pt },
        { code: 'TDS', name: 'Income Tax (TDS)', category: 'DEDUCTION', sequence: 8, amount: tds },
        { code: 'NET', name: 'Net Salary', category: 'NET', sequence: 9, amount: net },
      ];

      // Match with rule IDs where possible
      const ruleMap = {};
      for (const rule of rules) ruleMap[rule.code] = rule.id;

      await prisma.payslipLine.createMany({
        data: lines.map((l) => ({
          payslipId: payslip.id,
          salaryRuleId: ruleMap[l.code] || null,
          ...l,
          quantity: 1,
          rate: l.amount,
        })),
      });
    }

    // Update payrun totals
    await prisma.payrun.update({
      where: { id: payrun.id },
      data: {
        totalGross: Math.round(totalGross * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
      },
    });

    process.stdout.write(`  ✓ ${monthName} 2026 payrun processed\n`);
  }

  // Create September 2026 DRAFT payrun (for demo computation)
  const septPayrun = await prisma.payrun.create({
    data: {
      name: 'Payroll - September 2026',
      periodStart: new Date('2026-09-01'),
      periodEnd: new Date('2026-09-30'),
      salaryStructureId: regularStructure.id,
      status: 'DRAFT',
      createdById: payrollManager.id,
    },
  });

  // Add draft payslips for all employees including Het Patel
  for (const employee of employees) {
    await prisma.payslip.create({
      data: {
        payrunId: septPayrun.id,
        employeeId: employee.id,
        salaryStructureId: regularStructure.id,
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-30'),
        status: 'DRAFT',
      },
    });
  }

  console.log('\n✅ 8 historical payruns + 1 draft September payrun created\n');

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('=' .repeat(60));
  console.log('🎉 PeoplePay360 seed complete!\n');
  console.log('📊 Database Summary:');
  console.log(`   Departments: 4`);
  console.log(`   Employees: ${allEmployees.length + 1}`);
  console.log(`   Working Schedules: 2`);
  console.log(`   Salary Structures: 2`);
  console.log(`   Salary Rules: 19`);
  console.log(`   Time Off Types: 4`);
  console.log(`   Historical Payruns: 8 (PAID) + 1 (DRAFT - Sep 2026)`);
  console.log('');
  console.log('🔑 Demo Credentials:');
  console.log('   admin@peoplepay360.com          → Admin@123    (ADMIN)');
  console.log('   payrollmanager@peoplepay360.com → Pmgr@1234   (HR_PAYROLL_MANAGER)');
  console.log('   payrolluser@peoplepay360.com    → Pay@12345   (HR_PAYROLL_USER)');
  console.log('   hr@peoplepay360.com             → Hr@123456   (HR_MANAGER)');
  console.log('   employee@peoplepay360.com       → Emp@12345   (EMPLOYEE)');
  console.log('');
  console.log('🔍 Key Demo Scenario:');
  console.log('   Employee: Het Patel (EMP003)');
  console.log('   Contract 1: Jan-Jun 2026 @ ₹50,000 (EXPIRED)');
  console.log('   Contract 2: Jul-Dec 2026 @ ₹65,000 (ACTIVE)');
  console.log('   September Payrun → System MUST select Contract 2');
  console.log('   Salary jump (30%) → Anomaly detection triggered');
  console.log('=' .repeat(60));
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
