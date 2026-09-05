/**
 * PeoplePay360 Comprehensive Database Seed Script (TypeScript)
 * 
 * Populates the database with ~300 realistic Indian employee profiles,
 * working schedules, departments, salary structures, contracts, leave data,
 * attendance, payruns, payslips, policies, holidays, and audit logs.
 */

import { PrismaClient, Role, EmployeeType, EmployeeStatus, ContractStatus, ScheduleType, SalaryRuleCategory, SalaryRuleComputationType, TimeOffUnit, AllocationStatus, TimeOffRequestStatus, HolidaySource, HolidaySuggestionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const prisma = new PrismaClient();

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

const FIRST_NAMES_MALE = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayan', 'Krishna', 'Ishan',
  'Shaurya', 'Atharva', 'Advait', 'Pranav', 'Adhiraj', 'Kabir', 'Yash', 'Dev', 'Dhruv', 'Kian',
  'Rudra', 'Om', 'Samarth', 'Manan', 'Parth', 'Rishi', 'Ayush', 'Het', 'Ansh', 'Madhav',
  'Siddharth', 'Tejas', 'Shivam', 'Utkarsh', 'Jay', 'Kunal', 'Neeraj', 'Karan', 'Vikas', 'Sameer',
  'Alok', 'Amit', 'Rahul', 'Deepak', 'Suresh', 'Rajesh', 'Vijay', 'Sanjay', 'Prakash', 'Rakesh'
];

const FIRST_NAMES_FEMALE = [
  'Aadhya', 'Ananya', 'Pari', 'Anika', 'Navya', 'Diya', 'Avani', 'Saisha', 'Myra', 'Ira',
  'Prisha', 'Riya', 'Anvi', 'Anya', 'Ishita', 'Sara', 'Kavya', 'Aditi', 'Tanvi', 'Aarohi',
  'Deepa', 'Pooja', 'Meera', 'Priya', 'Sneha', 'Ritu', 'Divya', 'Neha', 'Swati', 'Archana',
  'Sunita', 'Vandana', 'Suman', 'Sunaina', 'Shalini', 'Mansi', 'Payal', 'Sonam', 'Priyanka', 'Anjali'
];

const LAST_NAMES = [
  'Patel', 'Sharma', 'Kumar', 'Singh', 'Shah', 'Verma', 'Gupta', 'Mehta', 'Joshi', 'Rao',
  'Reddy', 'Nair', 'Pillai', 'Zadafiya', 'Iyer', 'Deshmukh', 'Kulkarni', 'Banerjee', 'Chatterjee', 'Das',
  'Mukherjee', 'Sengupta', 'Trivedi', 'Bhat', 'Bhatia', 'Agarwal', 'Bansal', 'Garg', 'Saxena', 'Srivastava'
];

const BANK_NAMES = [
  'HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
  'IndusInd Bank', 'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'YES Bank'
];

const JOB_POSITIONS_BY_DEPT: Record<string, string[]> = {
  'Finance': ['Chief Financial Officer', 'Finance Manager', 'Senior Accountant', 'Payroll Specialist', 'Financial Analyst'],
  'Human Resources': ['HR Director', 'HR Manager', 'Talent Acquisition Lead', 'HR Payroll Specialist', 'HR Executive'],
  'Engineering': ['VP of Engineering', 'Engineering Manager', 'Principal Architect', 'Senior Software Engineer', 'Full Stack Developer', 'DevOps Engineer', 'QA Automation Engineer'],
  'Sales': ['VP of Sales', 'Sales Manager', 'Enterprise Account Executive', 'Business Development Manager'],
  'Marketing': ['Chief Marketing Officer', 'Marketing Manager', 'Content Strategist', 'Performance Marketer'],
  'Operations': ['VP of Operations', 'Operations Manager', 'Process Lead'],
  'Customer Support': ['Support Manager', 'Technical Support Specialist'],
  'Legal': ['General Counsel', 'Legal Associate'],
  'IT': ['IT Director', 'Systems Administrator', 'Network Engineer'],
  'Admin': ['Office Administrator', 'Executive Assistant']
};

async function main() {
  console.log('============================================================');
  console.log('🚀 PeoplePay360 Seed Script — Enterprise Demo Dataset Generator (TS)');
  console.log('============================================================\n');

  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.companyHoliday.deleteMany();
  await prisma.holidaySuggestion.deleteMany();
  await prisma.workingDaysPolicy.deleteMany();
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
  await prisma.attendanceLocationAudit.deleteMany();
  await prisma.attendanceLocation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.workingScheduleDay.deleteMany();
  await prisma.workingSchedule.deleteMany();
  console.log('✅ Cleanup complete\n');

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // Departments
  const departmentNames = [
    { name: 'Finance', description: 'Financial planning, accounting, and payroll compliance' },
    { name: 'Human Resources', description: 'People operations, talent acquisition, and employee welfare' },
    { name: 'Engineering', description: 'Software engineering, cloud infrastructure, and product design' },
    { name: 'Sales', description: 'Revenue generation, client partnerships, and account growth' },
    { name: 'Marketing', description: 'Brand management, demand generation, and communications' },
    { name: 'Operations', description: 'Business operations, logistics, and process excellence' },
    { name: 'Customer Support', description: 'Customer success and technical assistance' },
    { name: 'Legal', description: 'Legal compliance, risk management, and contracts' },
    { name: 'IT', description: 'Internal IT infrastructure, security, and hardware management' },
    { name: 'Admin', description: 'Office administration, facilities, and workplace services' },
  ];

  const departmentMap: Record<string, string> = {};
  for (const dept of departmentNames) {
    const created = await prisma.department.create({ data: dept });
    departmentMap[dept.name] = created.id;
  }

  // Working Schedules
  const stdSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Standard 9-6',
      type: ScheduleType.FIXED,
      weeklyHours: 40,
      isActive: true,
      days: {
        create: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 6, startTime: '', endTime: '', breakMinutes: 0, isWorkday: false },
          { dayOfWeek: 0, startTime: '', endTime: '', breakMinutes: 0, isWorkday: false },
        ]
      }
    }
  });

  const earlySchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Early Shift',
      type: ScheduleType.FIXED,
      weeklyHours: 40,
      isActive: true,
      days: {
        create: [
          { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 5, startTime: '08:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 6, startTime: '', endTime: '', breakMinutes: 0, isWorkday: false },
          { dayOfWeek: 0, startTime: '', endTime: '', breakMinutes: 0, isWorkday: false },
        ]
      }
    }
  });

  const flexSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Flexible Hours',
      type: ScheduleType.FLEXIBLE,
      weeklyHours: 40,
      isActive: true,
      days: {
        create: [
          { dayOfWeek: 1, startTime: '09:30', endTime: '18:00', breakMinutes: 30, isWorkday: true },
          { dayOfWeek: 2, startTime: '09:30', endTime: '18:00', breakMinutes: 30, isWorkday: true },
          { dayOfWeek: 3, startTime: '09:30', endTime: '18:00', breakMinutes: 30, isWorkday: true },
          { dayOfWeek: 4, startTime: '09:30', endTime: '18:00', breakMinutes: 30, isWorkday: true },
          { dayOfWeek: 5, startTime: '09:30', endTime: '18:00', breakMinutes: 30, isWorkday: true },
          { dayOfWeek: 6, startTime: '', endTime: '', breakMinutes: 0, isWorkday: false },
          { dayOfWeek: 0, startTime: '', endTime: '', breakMinutes: 0, isWorkday: false },
        ]
      }
    }
  });

  const shiftSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Rotational Shift A/B',
      type: ScheduleType.SHIFT,
      weeklyHours: 42,
      isActive: true,
      days: {
        create: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 6, startTime: '09:00', endTime: '16:00', breakMinutes: 60, isWorkday: true },
          { dayOfWeek: 0, startTime: '', endTime: '', breakMinutes: 0, isWorkday: false },
        ]
      }
    }
  });

  const schedules = [stdSchedule, earlySchedule, flexSchedule, shiftSchedule];

  // Locations
  const headOfficeLoc = await prisma.attendanceLocation.create({
    data: { name: 'Head Office (Ahmedabad)', latitude: 23.0225, longitude: 72.5714, radiusMeters: 500, isActive: true }
  });
  const branchOfficeLoc = await prisma.attendanceLocation.create({
    data: { name: 'Branch Office (Mumbai)', latitude: 19.0760, longitude: 72.8777, radiusMeters: 300, isActive: true }
  });
  const techParkLoc = await prisma.attendanceLocation.create({
    data: { name: 'Tech Park (Bengaluru)', latitude: 12.9716, longitude: 77.5946, radiusMeters: 400, isActive: true }
  });

  // Salary Structures
  const juniorStruct = await prisma.salaryStructure.create({
    data: {
      name: 'Junior Staff Structure',
      description: 'Standard pay structure for entry-level and junior employees',
      isActive: true,
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: SalaryRuleCategory.BASIC, sequence: 1, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 0 },
          { name: 'House Rent Allowance', code: 'HRA', category: SalaryRuleCategory.ALLOWANCE, sequence: 2, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 40, percentageBase: 'BASIC' },
          { name: 'Transport Allowance', code: 'TRANSPORT', category: SalaryRuleCategory.ALLOWANCE, sequence: 3, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 1600 },
          { name: 'Medical Allowance', code: 'MEDICAL', category: SalaryRuleCategory.ALLOWANCE, sequence: 4, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 1250 },
          { name: 'Gross Salary', code: 'GROSS', category: SalaryRuleCategory.GROSS, sequence: 5, computationType: SalaryRuleComputationType.FORMULA, formula: 'BASIC + HRA + TRANSPORT + MEDICAL' },
          { name: 'Provident Fund', code: 'PF', category: SalaryRuleCategory.DEDUCTION, sequence: 6, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 12, percentageBase: 'BASIC' },
          { name: 'Professional Tax', code: 'PT', category: SalaryRuleCategory.DEDUCTION, sequence: 7, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 200 },
          { name: 'Net Salary', code: 'NET', category: SalaryRuleCategory.NET, sequence: 8, computationType: SalaryRuleComputationType.FORMULA, formula: 'GROSS - PF - PT' },
        ]
      }
    }
  });

  const midStruct = await prisma.salaryStructure.create({
    data: {
      name: 'Mid-Level Structure',
      description: 'Structure for mid-level professionals and team leads',
      isActive: true,
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: SalaryRuleCategory.BASIC, sequence: 1, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 0 },
          { name: 'House Rent Allowance', code: 'HRA', category: SalaryRuleCategory.ALLOWANCE, sequence: 2, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 50, percentageBase: 'BASIC' },
          { name: 'Transport Allowance', code: 'TRANSPORT', category: SalaryRuleCategory.ALLOWANCE, sequence: 3, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 2000 },
          { name: 'Medical Allowance', code: 'MEDICAL', category: SalaryRuleCategory.ALLOWANCE, sequence: 4, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 2000 },
          { name: 'Special Allowance', code: 'SPECIAL', category: SalaryRuleCategory.ALLOWANCE, sequence: 5, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 15, percentageBase: 'BASIC' },
          { name: 'Gross Salary', code: 'GROSS', category: SalaryRuleCategory.GROSS, sequence: 6, computationType: SalaryRuleComputationType.FORMULA, formula: 'BASIC + HRA + TRANSPORT + MEDICAL + SPECIAL' },
          { name: 'Provident Fund', code: 'PF', category: SalaryRuleCategory.DEDUCTION, sequence: 7, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 12, percentageBase: 'BASIC' },
          { name: 'Professional Tax', code: 'PT', category: SalaryRuleCategory.DEDUCTION, sequence: 8, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 200 },
          { name: 'Income Tax (TDS)', code: 'TDS', category: SalaryRuleCategory.DEDUCTION, sequence: 9, computationType: SalaryRuleComputationType.FORMULA, formula: 'GROSS * 0.1 - 2500' },
          { name: 'Net Salary', code: 'NET', category: SalaryRuleCategory.NET, sequence: 10, computationType: SalaryRuleComputationType.FORMULA, formula: 'GROSS - PF - PT - TDS' },
        ]
      }
    }
  });

  const seniorStruct = await prisma.salaryStructure.create({
    data: {
      name: 'Senior/Manager Structure',
      description: 'Executive structure for managers, leads, and senior directors',
      isActive: true,
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: SalaryRuleCategory.BASIC, sequence: 1, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 0 },
          { name: 'House Rent Allowance', code: 'HRA', category: SalaryRuleCategory.ALLOWANCE, sequence: 2, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 50, percentageBase: 'BASIC' },
          { name: 'Transport Allowance', code: 'TRANSPORT', category: SalaryRuleCategory.ALLOWANCE, sequence: 3, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 3000 },
          { name: 'Medical Allowance', code: 'MEDICAL', category: SalaryRuleCategory.ALLOWANCE, sequence: 4, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 3000 },
          { name: 'Performance Allowance', code: 'PERFORMANCE', category: SalaryRuleCategory.ALLOWANCE, sequence: 5, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 20, percentageBase: 'BASIC' },
          { name: 'Special Allowance', code: 'SPECIAL', category: SalaryRuleCategory.ALLOWANCE, sequence: 6, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 15, percentageBase: 'BASIC' },
          { name: 'Gross Salary', code: 'GROSS', category: SalaryRuleCategory.GROSS, sequence: 7, computationType: SalaryRuleComputationType.FORMULA, formula: 'BASIC + HRA + TRANSPORT + MEDICAL + PERFORMANCE + SPECIAL' },
          { name: 'Provident Fund', code: 'PF', category: SalaryRuleCategory.DEDUCTION, sequence: 8, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 12, percentageBase: 'BASIC' },
          { name: 'Professional Tax', code: 'PT', category: SalaryRuleCategory.DEDUCTION, sequence: 9, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 200 },
          { name: 'Income Tax (TDS)', code: 'TDS', category: SalaryRuleCategory.DEDUCTION, sequence: 10, computationType: SalaryRuleComputationType.FORMULA, formula: 'GROSS * 0.15 - 4000' },
          { name: 'Net Salary', code: 'NET', category: SalaryRuleCategory.NET, sequence: 11, computationType: SalaryRuleComputationType.FORMULA, formula: 'GROSS - PF - PT - TDS' },
        ]
      }
    }
  });

  const startupStruct = await prisma.salaryStructure.create({
    data: {
      name: 'Het ki start up',
      description: 'Streamlined startup salary structure',
      isActive: true,
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: SalaryRuleCategory.BASIC, sequence: 1, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 0 },
          { name: 'House Rent Allowance', code: 'HRA', category: SalaryRuleCategory.ALLOWANCE, sequence: 2, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 40, percentageBase: 'BASIC' },
          { name: 'Transport Allowance', code: 'TRANSPORT', category: SalaryRuleCategory.ALLOWANCE, sequence: 3, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 1500 },
          { name: 'Gross Salary', code: 'GROSS', category: SalaryRuleCategory.GROSS, sequence: 4, computationType: SalaryRuleComputationType.FORMULA, formula: 'BASIC + HRA + TRANSPORT' },
          { name: 'Provident Fund', code: 'PF', category: SalaryRuleCategory.DEDUCTION, sequence: 5, computationType: SalaryRuleComputationType.PERCENTAGE, percentage: 12, percentageBase: 'BASIC' },
          { name: 'Professional Tax', code: 'PT', category: SalaryRuleCategory.DEDUCTION, sequence: 6, computationType: SalaryRuleComputationType.FIXED, fixedAmount: 200 },
          { name: 'Net Salary', code: 'NET', category: SalaryRuleCategory.NET, sequence: 7, computationType: SalaryRuleComputationType.FORMULA, formula: 'GROSS - PF - PT' },
        ]
      }
    }
  });

  // Employees & Users
  const TOTAL_EMPLOYEES = 300;
  const deptList = Object.keys(departmentMap);

  const demoAccounts = [
    { email: 'admin@peoplepay360.com', role: Role.ADMIN, code: 'EMP001', first: 'Priya', last: 'Sharma', dept: 'Human Resources', pos: 'HR Director' },
    { email: 'payrollmanager@peoplepay360.com', role: Role.HR_PAYROLL_MANAGER, code: 'EMP002', first: 'Rajesh', last: 'Kumar', dept: 'Finance', pos: 'Payroll Manager' },
    { email: 'payrolluser@peoplepay360.com', role: Role.HR_PAYROLL_USER, code: 'EMP003', first: 'Nisha', last: 'Bhatt', dept: 'Finance', pos: 'Payroll Specialist' },
    { email: 'hr@peoplepay360.com', role: Role.HR_MANAGER, code: 'EMP004', first: 'Deepa', last: 'Pillai', dept: 'Human Resources', pos: 'HR Manager' },
    { email: 'employee@peoplepay360.com', role: Role.EMPLOYEE, code: 'EMP005', first: 'Het', last: 'Zadafiya', dept: 'Engineering', pos: 'Senior Software Engineer' },
  ];

  const rolePool: Role[] = [
    ...Array(2).fill(Role.ADMIN),
    ...Array(4).fill(Role.HR_PAYROLL_MANAGER),
    ...Array(6).fill(Role.HR_PAYROLL_USER),
    ...Array(14).fill(Role.HR_MANAGER),
    ...Array(269).fill(Role.EMPLOYEE)
  ];

  const seededEmployees = [];
  const deptManagers: Record<string, string[]> = {};

  for (let i = 1; i <= TOTAL_EMPLOYEES; i++) {
    const code = `EMP${String(i).padStart(3, '0')}`;
    let email: string, role: Role, firstName: string, lastName: string, deptName: string, position: string;

    const demo = demoAccounts.find(d => d.code === code);
    if (demo) {
      email = demo.email;
      role = demo.role;
      firstName = demo.first;
      lastName = demo.last;
      deptName = demo.dept;
      position = demo.pos;
    } else {
      const isMale = i % 2 === 0;
      firstName = isMale ? randomItem(FIRST_NAMES_MALE) : randomItem(FIRST_NAMES_FEMALE);
      lastName = randomItem(LAST_NAMES);
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@peoplepay360.com`;
      role = rolePool[i - 6] || Role.EMPLOYEE;
      deptName = deptList[(i - 1) % deptList.length];
      const positions = JOB_POSITIONS_BY_DEPT[deptName] || ['Associate'];
      position = positions[i % positions.length];
    }

    const deptId = departmentMap[deptName];
    let status: EmployeeStatus = EmployeeStatus.ACTIVE;
    if (i > 270 && i <= 291) status = EmployeeStatus.INACTIVE;
    if (i > 291) status = EmployeeStatus.TERMINATED;

    let employeeType: EmployeeType = EmployeeType.FULL_TIME;
    if (i % 10 === 0) employeeType = EmployeeType.PART_TIME;
    if (i % 20 === 0) employeeType = EmployeeType.CONTRACT;

    const yearsAgo = randomBetween(1, 8);
    const month = randomBetween(0, 11);
    const day = randomBetween(1, 28);
    const joiningDate = new Date(Date.now() - yearsAgo * 365 * 86400000 + month * 30 * 86400000 + day * 86400000);
    const dob = new Date(joiningDate.getFullYear() - randomBetween(22, 50), month, day);

    const hasBankDetails = i % 7 !== 0;
    const bankAccountName = hasBankDetails ? `${firstName} ${lastName}` : null;
    const bankAccountNumber = hasBankDetails ? `${randomBetween(10000000000, 99999999999)}` : null;
    const bankName = hasBankDetails ? randomItem(BANK_NAMES) : null;
    const panNumber = hasBankDetails ? `${lastName.slice(0, 3).toUpperCase()}${firstName.slice(0, 2).toUpperCase()}${randomBetween(1000, 9999)}P` : null;

    let managerId: string | null = null;
    if (!deptManagers[deptName]) deptManagers[deptName] = [];
    if (deptManagers[deptName].length > 0 && status === EmployeeStatus.ACTIVE) {
      managerId = deptManagers[deptName][0];
    }

    const scheduleId = schedules[(i - 1) % schedules.length].id;
    const locationId = [headOfficeLoc.id, branchOfficeLoc.id, techParkLoc.id][i % 3];

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        role,
        isActive: status !== EmployeeStatus.TERMINATED,
      }
    });

    const employee = await prisma.employee.create({
      data: {
        employeeCode: code,
        firstName,
        lastName,
        email,
        phone: `+91-${randomBetween(7000000000, 9999999999)}`,
        dateOfBirth: dob,
        joiningDate,
        departmentId: deptId,
        managerId,
        jobPosition: position,
        employeeType,
        status,
        userId: user.id,
        workingScheduleId: scheduleId,
        attendanceLocationId: locationId,
        bankAccountName,
        bankAccountNumber,
        bankName,
        panNumber,
      }
    });

    if (deptManagers[deptName].length < 2 && status === EmployeeStatus.ACTIVE) {
      deptManagers[deptName].push(employee.id);
    }

    seededEmployees.push(employee);
  }

  console.log(`✅ ${seededEmployees.length} Employees and Users created\n`);

  console.log('🎉 Seed (TS) completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
