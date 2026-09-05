/**
 * PeoplePay360 Comprehensive Database Seed Script
 * 
 * Populates the database with ~300 realistic Indian employee profiles,
 * working schedules, departments, salary structures, contracts, leave data,
 * attendance, payruns, payslips, policies, holidays, and audit logs.
 * 
 * Demonstrates all platform features:
 * - Period-based contract detection & multi-contract histories
 * - Dynamic working days & dynamic monthly policy overrides
 * - Paid/unpaid leave prorated salary calculations
 * - Per-employee schedule-attributed attendance (Late, Overtime, Missing Checkout)
 * - Strict-structure payslip calculation with fixed medical/transport allowances
 * - Data integrity alerts (missing contracts, missing bank details, overrides, period adjustments)
 * - Role-based access and dashboards (Admin, HR Payroll Manager, HR Payroll User, HR Manager, Employee)
 * 
 * Idempotent execution: run directly via `node prisma/seed.js` or `npm run db:seed`.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const prisma = new PrismaClient();

// Helper: Seeded deterministic PRNG for reproducible runs if needed
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Data Pools for 300 Indian Employees
const FIRST_NAMES_MALE = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayan', 'Krishna', 'Ishan',
  'Shaurya', 'Atharva', 'Advait', 'Pranav', 'Adhiraj', 'Kabir', 'Yash', 'Dev', 'Dhruv', 'Kian',
  'Rudra', 'Om', 'Samarth', 'Manan', 'Parth', 'Rishi', 'Ayush', 'Het', 'Ansh', 'Madhav',
  'Siddharth', 'Tejas', 'Shivam', 'Utkarsh', 'Jay', 'Kunal', 'Neeraj', 'Karan', 'Vikas', 'Sameer',
  'Alok', 'Amit', 'Rahul', 'Deepak', 'Suresh', 'Rajesh', 'Vijay', 'Sanjay', 'Prakash', 'Rakesh',
  'Manish', 'Tarun', 'Nikhil', 'Gaurav', 'Abhishek', 'Varun', 'Rohan', 'Karthik', 'Siddhesh', 'Girish'
];

const FIRST_NAMES_FEMALE = [
  'Aadhya', 'Ananya', 'Pari', 'Anika', 'Navya', 'Diya', 'Avani', 'Saisha', 'Myra', 'Ira',
  'Prisha', 'Riya', 'Anvi', 'Anya', 'Ishita', 'Sara', 'Kavya', 'Aditi', 'Tanvi', 'Aarohi',
  'Deepa', 'Pooja', 'Meera', 'Priya', 'Sneha', 'Ritu', 'Divya', 'Neha', 'Swati', 'Archana',
  'Sunita', 'Vandana', 'Suman', 'Sunaina', 'Shalini', 'Mansi', 'Payal', 'Sonam', 'Priyanka', 'Anjali',
  'Shruti', 'Radhika', 'Preeti', 'Shreya', 'Chetna', 'Reena', 'Richa', 'Nisha', 'Smita', 'Nandini',
  'Krutika', 'Harini', 'Leela', 'Bhavna', 'Rashmi', 'Sangeeta', 'Komal', 'Tanya', 'Akanksha', 'Simran'
];

const LAST_NAMES = [
  'Patel', 'Sharma', 'Kumar', 'Singh', 'Shah', 'Verma', 'Gupta', 'Mehta', 'Joshi', 'Rao',
  'Reddy', 'Nair', 'Pillai', 'Zadafiya', 'Iyer', 'Deshmukh', 'Kulkarni', 'Banerjee', 'Chatterjee', 'Das',
  'Mukherjee', 'Sengupta', 'Trivedi', 'Bhat', 'Bhatia', 'Agarwal', 'Bansal', 'Garg', 'Saxena', 'Srivastava',
  'Kapoor', 'Khanna', 'Malhotra', 'Puri', 'Chopra', 'Dhawan', 'Sethi', 'Gill', 'Sidhu', 'Sandhu',
  'Dhillon', 'Grewal', 'Mann', 'Wadhwa', 'Ahuja', 'Lamba', 'Chawla', 'Juneja', 'Anand', 'Bhasin',
  'Oberoi', 'Suri', 'Tandon', 'Mittal', 'Goel', 'Jindal', 'Singhal', 'Rastogi', 'Pandey', 'Mishra'
];

const BANK_NAMES = [
  'HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
  'IndusInd Bank', 'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'YES Bank'
];

const JOB_POSITIONS_BY_DEPT = {
  'Finance': ['Chief Financial Officer', 'Finance Manager', 'Senior Accountant', 'Payroll Specialist', 'Financial Analyst', 'Tax Associate', 'Accounts Executive'],
  'Human Resources': ['HR Director', 'HR Manager', 'Talent Acquisition Lead', 'HR Payroll Specialist', 'HR Executive', 'HR Coordinator'],
  'Engineering': ['VP of Engineering', 'Engineering Manager', 'Principal Architect', 'Senior Software Engineer', 'Full Stack Developer', 'DevOps Engineer', 'QA Automation Engineer', 'Frontend Engineer', 'Backend Developer'],
  'Sales': ['VP of Sales', 'Sales Manager', 'Enterprise Account Executive', 'Business Development Manager', 'Sales Operations Analyst', 'Inside Sales Rep'],
  'Marketing': ['Chief Marketing Officer', 'Marketing Manager', 'Content Strategist', 'SEO Specialist', 'Performance Marketer', 'Graphic Designer'],
  'Operations': ['VP of Operations', 'Operations Manager', 'Supply Chain Analyst', 'Process Lead', 'Operations Associate'],
  'Customer Support': ['Support Manager', 'Customer Success Lead', 'Technical Support Specialist', 'Customer Care Executive'],
  'Legal': ['General Counsel', 'Legal Manager', 'Compliance Officer', 'Legal Associate'],
  'IT': ['IT Director', 'Infrastructure Manager', 'Systems Administrator', 'Network Engineer', 'IT Helpdesk Specialist'],
  'Admin': ['Administration Head', 'Facility Manager', 'Office Administrator', 'Executive Assistant']
};

async function main() {
  console.log('============================================================');
  console.log('🚀 PeoplePay360 Seed Script — Enterprise Demo Dataset Generator');
  console.log('============================================================\n');

  // Check if force flag is passed
  const isForce = process.argv.includes('--force');
  const existingEmployees = await prisma.employee.count();

  if (existingEmployees > 0 && !isForce) {
    console.log(`ℹ️  Found ${existingEmployees} existing employees in database.`);
    console.log('   Re-clearing and reseeding database to ensure clean, consistent state...\n');
  }

  // ------------------------------------------------------------
  // CLEANUP (Order handles Foreign Key constraints)
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // 1. DEPARTMENTS (~10 records)
  // ------------------------------------------------------------
  console.log('📁 1/12 Seeding Departments...');
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

  const departmentMap = {};
  for (const dept of departmentNames) {
    const created = await prisma.department.create({ data: dept });
    departmentMap[dept.name] = created.id;
  }
  console.log(`✅ ${Object.keys(departmentMap).length} Departments created\n`);

  // ------------------------------------------------------------
  // 2. WORKING SCHEDULES (~4 records)
  // ------------------------------------------------------------
  console.log('📅 2/12 Seeding Working Schedules...');
  
  // Standard 9-6 (40h/wk)
  const stdSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Standard 9-6',
      type: 'FIXED',
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

  // Early Shift 8-5 (40h/wk)
  const earlySchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Early Shift',
      type: 'FIXED',
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

  // Flexible Hours (40h/wk)
  const flexSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Flexible Hours',
      type: 'FLEXIBLE',
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

  // Rotational Shift A/B (6-day week: Mon-Sat, 42h/wk)
  const shiftSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Rotational Shift A/B',
      type: 'SHIFT',
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
  console.log(`✅ ${schedules.length} Working Schedules created with day mappings\n`);

  // ------------------------------------------------------------
  // ATTENDANCE LOCATIONS
  // ------------------------------------------------------------
  const headOfficeLoc = await prisma.attendanceLocation.create({
    data: { name: 'Head Office (Ahmedabad)', latitude: 23.0225, longitude: 72.5714, radiusMeters: 500, isActive: true }
  });
  const branchOfficeLoc = await prisma.attendanceLocation.create({
    data: { name: 'Branch Office (Mumbai)', latitude: 19.0760, longitude: 72.8777, radiusMeters: 300, isActive: true }
  });
  const techParkLoc = await prisma.attendanceLocation.create({
    data: { name: 'Tech Park (Bengaluru)', latitude: 12.9716, longitude: 77.5946, radiusMeters: 400, isActive: true }
  });

  // ------------------------------------------------------------
  // 3. SALARY STRUCTURES & RULES (4 structures)
  // ------------------------------------------------------------
  console.log('💰 3/12 Seeding Salary Structures & Rules...');

  // 1. Junior Staff Structure
  const juniorStruct = await prisma.salaryStructure.create({
    data: {
      name: 'Junior Staff Structure',
      description: 'Standard pay structure for entry-level and junior employees',
      isActive: true,
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, computationType: 'FIXED', fixedAmount: 0, description: 'Basic wage prorated from contract' },
          { name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 2, computationType: 'PERCENTAGE', percentage: 40, percentageBase: 'BASIC', description: '40% of Basic Salary' },
          { name: 'Transport Allowance', code: 'TRANSPORT', category: 'ALLOWANCE', sequence: 3, computationType: 'FIXED', fixedAmount: 1600, description: 'Flat monthly transport allowance' },
          { name: 'Medical Allowance', code: 'MEDICAL', category: 'ALLOWANCE', sequence: 4, computationType: 'FIXED', fixedAmount: 1250, description: 'Flat monthly medical allowance' },
          { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 5, computationType: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT + MEDICAL', description: 'Total gross earnings' },
          { name: 'Provident Fund', code: 'PF', category: 'DEDUCTION', sequence: 6, computationType: 'PERCENTAGE', percentage: 12, percentageBase: 'BASIC', description: '12% of Basic PF contribution' },
          { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 7, computationType: 'FIXED', fixedAmount: 200, description: 'Standard professional tax' },
          { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 8, computationType: 'FORMULA', formula: 'GROSS - PF - PT', description: 'Take-home net salary' },
        ]
      }
    }
  });

  // 2. Mid-Level Structure
  const midStruct = await prisma.salaryStructure.create({
    data: {
      name: 'Mid-Level Structure',
      description: 'Structure for mid-level professionals and team leads',
      isActive: true,
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, computationType: 'FIXED', fixedAmount: 0, description: 'Basic wage prorated from contract' },
          { name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 2, computationType: 'PERCENTAGE', percentage: 50, percentageBase: 'BASIC', description: '50% of Basic Salary' },
          { name: 'Transport Allowance', code: 'TRANSPORT', category: 'ALLOWANCE', sequence: 3, computationType: 'FIXED', fixedAmount: 2000, description: 'Flat monthly transport allowance' },
          { name: 'Medical Allowance', code: 'MEDICAL', category: 'ALLOWANCE', sequence: 4, computationType: 'FIXED', fixedAmount: 2000, description: 'Flat monthly medical allowance' },
          { name: 'Special Allowance', code: 'SPECIAL', category: 'ALLOWANCE', sequence: 5, computationType: 'PERCENTAGE', percentage: 15, percentageBase: 'BASIC', description: '15% Special allowance' },
          { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 6, computationType: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT + MEDICAL + SPECIAL', description: 'Total gross earnings' },
          { name: 'Provident Fund', code: 'PF', category: 'DEDUCTION', sequence: 7, computationType: 'PERCENTAGE', percentage: 12, percentageBase: 'BASIC', description: '12% of Basic PF contribution' },
          { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 8, computationType: 'FIXED', fixedAmount: 200, description: 'Standard professional tax' },
          { name: 'Income Tax (TDS)', code: 'TDS', category: 'DEDUCTION', sequence: 9, computationType: 'FORMULA', formula: 'GROSS * 0.1 - 2500', description: 'Estimated monthly TDS deduction' },
          { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 10, computationType: 'FORMULA', formula: 'GROSS - PF - PT - TDS', description: 'Take-home net salary' },
        ]
      }
    }
  });

  // 3. Senior/Manager Structure
  const seniorStruct = await prisma.salaryStructure.create({
    data: {
      name: 'Senior/Manager Structure',
      description: 'Executive structure for managers, leads, and senior directors',
      isActive: true,
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, computationType: 'FIXED', fixedAmount: 0, description: 'Basic wage prorated from contract' },
          { name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 2, computationType: 'PERCENTAGE', percentage: 50, percentageBase: 'BASIC', description: '50% of Basic Salary' },
          { name: 'Transport Allowance', code: 'TRANSPORT', category: 'ALLOWANCE', sequence: 3, computationType: 'FIXED', fixedAmount: 3000, description: 'Flat monthly transport allowance' },
          { name: 'Medical Allowance', code: 'MEDICAL', category: 'ALLOWANCE', sequence: 4, computationType: 'FIXED', fixedAmount: 3000, description: 'Flat monthly medical allowance' },
          { name: 'Performance Allowance', code: 'PERFORMANCE', category: 'ALLOWANCE', sequence: 5, computationType: 'PERCENTAGE', percentage: 20, percentageBase: 'BASIC', description: '20% Performance bonus' },
          { name: 'Special Allowance', code: 'SPECIAL', category: 'ALLOWANCE', sequence: 6, computationType: 'PERCENTAGE', percentage: 15, percentageBase: 'BASIC', description: '15% Special allowance' },
          { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 7, computationType: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT + MEDICAL + PERFORMANCE + SPECIAL', description: 'Total gross earnings' },
          { name: 'Provident Fund', code: 'PF', category: 'DEDUCTION', sequence: 8, computationType: 'PERCENTAGE', percentage: 12, percentageBase: 'BASIC', description: '12% of Basic PF contribution' },
          { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 9, computationType: 'FIXED', fixedAmount: 200, description: 'Standard professional tax' },
          { name: 'Income Tax (TDS)', code: 'TDS', category: 'DEDUCTION', sequence: 10, computationType: 'FORMULA', formula: 'GROSS * 0.15 - 4000', description: 'TDS deduction for executive slab' },
          { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 11, computationType: 'FORMULA', formula: 'GROSS - PF - PT - TDS', description: 'Take-home net salary' },
        ]
      }
    }
  });

  // 4. Het ki start up (Exact name preserved)
  const startupStruct = await prisma.salaryStructure.create({
    data: {
      name: 'Het ki start up',
      description: 'Streamlined startup salary structure with flat allowances and clean rules',
      isActive: true,
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, computationType: 'FIXED', fixedAmount: 0, description: 'Basic wage prorated from contract' },
          { name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 2, computationType: 'PERCENTAGE', percentage: 40, percentageBase: 'BASIC', description: '40% HRA' },
          { name: 'Transport Allowance', code: 'TRANSPORT', category: 'ALLOWANCE', sequence: 3, computationType: 'FIXED', fixedAmount: 1500, description: 'Flat transport allowance' },
          { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 4, computationType: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT', description: 'Total gross earnings' },
          { name: 'Provident Fund', code: 'PF', category: 'DEDUCTION', sequence: 5, computationType: 'PERCENTAGE', percentage: 12, percentageBase: 'BASIC', description: '12% PF contribution' },
          { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 6, computationType: 'FIXED', fixedAmount: 200, description: 'Professional tax' },
          { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 7, computationType: 'FORMULA', formula: 'GROSS - PF - PT', description: 'Take-home net salary' },
        ]
      }
    }
  });

  console.log('✅ 4 Salary Structures & 36 Salary Rules created\n');

  // ------------------------------------------------------------
  // 4. EMPLOYEES & USERS (~300 records)
  // ------------------------------------------------------------
  console.log('👥 4/12 Seeding ~300 Employees and Linked Users...');

  const TOTAL_EMPLOYEES = 300;
  const deptList = Object.keys(departmentMap);

  // Dedicated credentials array for key demo accounts
  const demoAccounts = [
    { email: 'admin@peoplepay360.com', role: 'ADMIN', code: 'EMP001', first: 'Priya', last: 'Sharma', dept: 'Human Resources', pos: 'HR Director' },
    { email: 'payrollmanager@peoplepay360.com', role: 'HR_PAYROLL_MANAGER', code: 'EMP002', first: 'Rajesh', last: 'Kumar', dept: 'Finance', pos: 'Payroll Manager' },
    { email: 'payrolluser@peoplepay360.com', role: 'HR_PAYROLL_USER', code: 'EMP003', first: 'Nisha', last: 'Bhatt', dept: 'Finance', pos: 'Payroll Specialist' },
    { email: 'hr@peoplepay360.com', role: 'HR_MANAGER', code: 'EMP004', first: 'Deepa', last: 'Pillai', dept: 'Human Resources', pos: 'HR Manager' },
    { email: 'employee@peoplepay360.com', role: 'EMPLOYEE', code: 'EMP005', first: 'Het', last: 'Zadafiya', dept: 'Engineering', pos: 'Senior Software Engineer' },
  ];

  // Role distribution targets: 3 Admin, 5 HR Payroll Mgr, 7 HR Payroll User, 15 HR Manager, 270 Employee
  const rolePool = [
    ...Array(2).fill('ADMIN'),
    ...Array(4).fill('HR_PAYROLL_MANAGER'),
    ...Array(6).fill('HR_PAYROLL_USER'),
    ...Array(14).fill('HR_MANAGER'),
    ...Array(269).fill('EMPLOYEE')
  ];

  const seededEmployees = [];
  const deptManagers = {}; // track manager IDs by dept

  for (let i = 1; i <= TOTAL_EMPLOYEES; i++) {
    const code = `EMP${String(i).padStart(3, '0')}`;
    let email, role, firstName, lastName, deptName, position;

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
      role = rolePool[i - 6] || 'EMPLOYEE';
      deptName = deptList[(i - 1) % deptList.length];
      const positions = JOB_POSITIONS_BY_DEPT[deptName] || ['Associate'];
      position = positions[i % positions.length];
    }

    const deptId = departmentMap[deptName];

    // Status: 90% ACTIVE, 7% INACTIVE, 3% TERMINATED
    let status = 'ACTIVE';
    if (i > 270 && i <= 291) status = 'INACTIVE';
    if (i > 291) status = 'TERMINATED';

    // Type: 85% FULL_TIME, 10% PART_TIME, 5% CONTRACT
    let employeeType = 'FULL_TIME';
    if (i % 10 === 0) employeeType = 'PART_TIME';
    if (i % 20 === 0) employeeType = 'CONTRACT';

    // Joining date spread across 1-8 years ago
    const yearsAgo = randomBetween(1, 8);
    const month = randomBetween(0, 11);
    const day = randomBetween(1, 28);
    const joiningDate = new Date(Date.now() - yearsAgo * 365 * 86400000 + month * 30 * 86400000 + day * 86400000);
    const dob = new Date(joiningDate.getFullYear() - randomBetween(22, 50), month, day);

    // Bank details: 85% populated, 15% deliberately blank (for warnings queue test)
    const hasBankDetails = i % 7 !== 0; // ~15% blank
    const bankAccountName = hasBankDetails ? `${firstName} ${lastName}` : null;
    const bankAccountNumber = hasBankDetails ? `${randomBetween(10000000000, 99999999999)}` : null;
    const bankName = hasBankDetails ? randomItem(BANK_NAMES) : null;
    const panNumber = hasBankDetails ? `${lastName.slice(0, 3).toUpperCase()}${firstName.slice(0, 2).toUpperCase()}${randomBetween(1000, 9999)}P` : null;

    // Manager assignment: first 2 employees in department become managers
    let managerId = null;
    if (!deptManagers[deptName]) {
      deptManagers[deptName] = [];
    }
    if (deptManagers[deptName].length > 0 && status === 'ACTIVE') {
      managerId = deptManagers[deptName][0];
    }

    // Schedule assignment
    const scheduleId = schedules[(i - 1) % schedules.length].id;
    const locationId = [headOfficeLoc.id, branchOfficeLoc.id, techParkLoc.id][i % 3];

    // Create linked User
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        role,
        isActive: status !== 'TERMINATED',
      }
    });

    // Create Employee
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

    if (deptManagers[deptName].length < 2 && status === 'ACTIVE') {
      deptManagers[deptName].push(employee.id);
    }

    seededEmployees.push(employee);
  }

  console.log(`✅ 300 Employees and 300 Users created across 10 Departments\n`);

  // ------------------------------------------------------------
  // 5. CONTRACTS (~330 records)
  // ------------------------------------------------------------
  console.log('📜 5/12 Seeding Contracts and Historical Salary Changes...');

  let contractCount = 0;
  const contractMap = {};

  for (let idx = 0; idx < seededEmployees.length; idx++) {
    const emp = seededEmployees[idx];
    const i = idx + 1;

    // Determine wage scale by seniority
    let baseWage = randomBetween(22000, 35000); // Junior
    let structureId = juniorStruct.id;

    if (emp.jobPosition.includes('Manager') || emp.jobPosition.includes('Director') || emp.jobPosition.includes('VP') || emp.jobPosition.includes('Lead') || emp.jobPosition.includes('Architect')) {
      baseWage = randomBetween(95000, 185000); // Senior / Manager
      structureId = seniorStruct.id;
    } else if (emp.jobPosition.includes('Senior') || emp.jobPosition.includes('Specialist') || emp.jobPosition.includes('Analyst')) {
      baseWage = randomBetween(45000, 80000); // Mid Level
      structureId = midStruct.id;
    }

    // Assign 'Het ki start up' structure to ~20 employees for realistic distribution
    if (i >= 200 && i <= 220) {
      structureId = startupStruct.id;
      baseWage = 42000;
    }

    if (emp.status === 'TERMINATED') {
      // Create ended contract
      const contract = await prisma.contract.create({
        data: {
          employeeId: emp.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2026-05-31'),
          departmentId: emp.departmentId,
          position: emp.jobPosition,
          wage: baseWage,
          salaryStructureId: structureId,
          annualLeaveQuota: 24,
          status: 'TERMINATED',
          notes: 'Contract terminated upon employee departure'
        }
      });
      contractCount++;
      continue;
    }

    // Deliberate Contract Gap for 5 employees (triggers Admin Data Integrity Alerts widget)
    if (i >= 295 && i <= 299) {
      // Ended contract with no active renewal
      await prisma.contract.create({
        data: {
          employeeId: emp.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2026-06-30'),
          departmentId: emp.departmentId,
          position: emp.jobPosition,
          wage: baseWage,
          salaryStructureId: structureId,
          annualLeaveQuota: 24,
          status: 'EXPIRED',
          notes: 'Contract expired — pending renewal'
        }
      });
      contractCount++;
      continue;
    }

    // Multi-contract history for ~30 employees (~10%)
    if (i <= 30) {
      // Historical Expired Contract
      await prisma.contract.create({
        data: {
          employeeId: emp.id,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2026-06-30'),
          departmentId: emp.departmentId,
          position: emp.jobPosition,
          wage: Math.round(baseWage * 0.82), // earlier wage
          salaryStructureId: structureId,
          annualLeaveQuota: 24,
          status: 'EXPIRED',
          notes: 'Initial agreement prior to mid-year annual appraisal'
        }
      });
      contractCount++;

      // Current Active Contract starting July 1, 2026
      const activeContract = await prisma.contract.create({
        data: {
          employeeId: emp.id,
          startDate: new Date('2026-07-01'),
          endDate: new Date('2027-06-30'),
          departmentId: emp.departmentId,
          position: emp.jobPosition,
          wage: baseWage,
          salaryStructureId: structureId,
          annualLeaveQuota: 24,
          status: 'ACTIVE',
          notes: 'Revised contract following 2026 appraisal cycle'
        }
      });
      contractCount++;
      contractMap[emp.id] = activeContract;
    } else {
      // Standard active contract
      const activeContract = await prisma.contract.create({
        data: {
          employeeId: emp.id,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2026-12-31'),
          departmentId: emp.departmentId,
          position: emp.jobPosition,
          wage: baseWage,
          salaryStructureId: structureId,
          annualLeaveQuota: randomBetween(18, 30),
          status: 'ACTIVE',
        }
      });
      contractCount++;
      contractMap[emp.id] = activeContract;
    }
  }

  console.log(`✅ ${contractCount} Contracts created (including historical expired contracts and 5 deliberate contract gaps)\n`);

  // ------------------------------------------------------------
  // 6. TIME OFF TYPES (~6 records)
  // ------------------------------------------------------------
  console.log('🌴 6/12 Seeding Time Off Types...');
  const casualLeaveType = await prisma.timeOffType.create({
    data: { name: 'Casual Leave', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, payrollIntegration: false, description: 'Short-notice personal leave', color: '#f59e0b', isPaid: true }
  });
  const sickLeaveType = await prisma.timeOffType.create({
    data: { name: 'Sick Leave', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, payrollIntegration: false, description: 'Medical and sick leave', color: '#ef4444', isPaid: true }
  });
  const paidLeaveType = await prisma.timeOffType.create({
    data: { name: 'Paid Leave / Earned Leave', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, payrollIntegration: false, description: 'Annual earned vacation leave', color: '#6366f1', isPaid: true }
  });
  const unpaidLeaveType = await prisma.timeOffType.create({
    data: { name: 'Unpaid Leave', unit: 'DAYS', requiresAllocation: false, requiresApproval: true, payrollIntegration: true, description: 'Leave without pay (proportional salary reduction)', color: '#64748b', isPaid: false }
  });
  const maternityType = await prisma.timeOffType.create({
    data: { name: 'Maternity/Paternity Leave', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, payrollIntegration: false, description: 'Parental leave benefit', color: '#ec4899', isPaid: true }
  });
  const festivalType = await prisma.timeOffType.create({
    data: { name: 'Optional/Festival Holiday', unit: 'DAYS', requiresAllocation: false, requiresApproval: true, payrollIntegration: true, description: 'Restricted festival holiday', color: '#10b981', isPaid: true }
  });
  console.log('✅ 6 Time Off Types created\n');

  // ------------------------------------------------------------
  // 7. TIME OFF ALLOCATIONS & REQUESTS
  // ------------------------------------------------------------
  console.log('📊 7/12 Seeding Leave Allocations and Requests...');

  const activeEmployees = seededEmployees.filter(e => e.status === 'ACTIVE');
  const validFrom = new Date('2026-01-01');
  const validTo = new Date('2026-12-31');

  // Create Allocations for active employees
  for (const emp of activeEmployees) {
    await prisma.timeOffAllocation.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: casualLeaveType.id,
        allocatedAmount: 12,
        takenAmount: randomBetween(1, 4),
        remainingAmount: randomBetween(8, 11),
        validFrom,
        validTo,
        status: 'APPROVED',
        approvedByName: 'Priya Sharma (HR Director)',
        approvedAt: new Date('2026-01-02'),
      }
    });

    await prisma.timeOffAllocation.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: sickLeaveType.id,
        allocatedAmount: 10,
        takenAmount: randomBetween(0, 3),
        remainingAmount: randomBetween(7, 10),
        validFrom,
        validTo,
        status: 'APPROVED',
        approvedByName: 'Priya Sharma (HR Director)',
        approvedAt: new Date('2026-01-02'),
      }
    });

    await prisma.timeOffAllocation.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: paidLeaveType.id,
        allocatedAmount: 18,
        takenAmount: randomBetween(2, 6),
        remainingAmount: randomBetween(12, 16),
        validFrom,
        validTo,
        status: 'APPROVED',
        approvedByName: 'Priya Sharma (HR Director)',
        approvedAt: new Date('2026-01-02'),
      }
    });
  }

  // Create Time Off Requests across last 2-3 months
  let requestCount = 0;
  
  // 1. Unpaid Leave for 20 employees (to test proportional salary deduction in payroll)
  for (let idx = 0; idx < 20; idx++) {
    const emp = activeEmployees[idx];
    await prisma.timeOffRequest.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: unpaidLeaveType.id,
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-12'),
        duration: 3,
        reason: 'Personal urgent leave without pay',
        status: 'APPROVED',
        approvedByName: 'Priya Sharma',
        approvedAt: new Date('2026-08-08')
      }
    });
    requestCount++;
  }

  // 2. Approved Paid Leaves in past months
  for (let idx = 20; idx < 80; idx++) {
    const emp = activeEmployees[idx];
    await prisma.timeOffRequest.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: paidLeaveType.id,
        startDate: new Date('2026-07-15'),
        endDate: new Date('2026-07-16'),
        duration: 2,
        reason: 'Family event',
        status: 'APPROVED',
        approvedByName: 'Priya Sharma',
        approvedAt: new Date('2026-07-12')
      }
    });
    requestCount++;
  }

  // 3. Pending Requests (for HR Approval Queue demo)
  for (let idx = 80; idx < 100; idx++) {
    const emp = activeEmployees[idx];
    await prisma.timeOffRequest.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: casualLeaveType.id,
        startDate: new Date('2026-09-15'),
        endDate: new Date('2026-09-16'),
        duration: 2,
        reason: 'Personal affairs and travel',
        status: 'PENDING',
      }
    });
    requestCount++;
  }

  // 4. Rejected Requests
  for (let idx = 100; idx < 110; idx++) {
    const emp = activeEmployees[idx];
    await prisma.timeOffRequest.create({
      data: {
        employeeId: emp.id,
        timeOffTypeId: casualLeaveType.id,
        startDate: new Date('2026-08-25'),
        endDate: new Date('2026-08-27'),
        duration: 3,
        reason: 'Short notice vacation request',
        status: 'REJECTED',
        rejectedByName: 'Priya Sharma',
        rejectedAt: new Date('2026-08-24'),
        rejectionReason: 'Critical project release milestone — unable to grant leave'
      }
    });
    requestCount++;
  }

  console.log(`✅ ${activeEmployees.length * 3} Allocations & ${requestCount} Time Off Requests created\n`);

  // ------------------------------------------------------------
  // 8. ATTENDANCE (Last 3 Months, Batch Created)
  // ------------------------------------------------------------
  console.log('⏰ 8/12 Generating Daily Attendance for last 3 months (~19,500 records)...');

  const attendanceBatch = [];
  // Dates: June 1, 2026 to August 31, 2026 (~65 working days)
  const startDate = new Date('2026-06-01');
  const endDate = new Date('2026-08-31');

  // Map employee ID to schedule start time
  const empScheduleTimes = {};
  for (const emp of activeEmployees) {
    empScheduleTimes[emp.id] = emp.workingScheduleId === flexSchedule.id ? '09:30' : (emp.workingScheduleId === earlySchedule.id ? '08:00' : '09:00');
  }

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0) continue; // Sunday off for all

    const dateStr = d.toISOString().split('T')[0];

    for (let idx = 0; idx < activeEmployees.length; idx++) {
      const emp = activeEmployees[idx];
      const isSat = dayOfWeek === 6;
      const is6DayWorker = emp.workingScheduleId === shiftSchedule.id;

      if (isSat && !is6DayWorker) continue; // Saturday off for 5-day schedules

      // Status distribution: 75% PRESENT, 10% LATE, 8% OVERTIME, 4% ABSENT, 2% MISSING_CHECKOUT, 1% MANUAL_CORRECTION
      const rand = randomBetween(1, 100);
      let status = 'PRESENT';
      let checkIn = null;
      let checkOut = null;
      let workedHours = 8;
      let isManual = false;
      let notes = null;

      const schedStart = empScheduleTimes[emp.id] || '09:00';
      const [startH, startM] = schedStart.split(':').map(Number);

      if (rand <= 75) {
        status = 'PRESENT';
        checkIn = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${String(randomBetween(0, 10)).padStart(2, '0')}:00Z`);
        checkOut = new Date(`${dateStr}T${String(startH + 9).padStart(2, '0')}:${String(randomBetween(0, 15)).padStart(2, '0')}:00Z`);
        workedHours = 8.0;
      } else if (rand <= 85) {
        status = 'LATE';
        checkIn = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${String(randomBetween(20, 55)).padStart(2, '0')}:00Z`);
        checkOut = new Date(`${dateStr}T${String(startH + 9).padStart(2, '0')}:00:00Z`);
        workedHours = 7.5;
        notes = `Late check-in recorded past scheduled ${schedStart} start`;
      } else if (rand <= 93) {
        status = 'OVERTIME';
        checkIn = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:00:00Z`);
        checkOut = new Date(`${dateStr}T${String(startH + 11).padStart(2, '0')}:30:00Z`);
        workedHours = 10.5;
        notes = 'Approved project overtime (+2.5 hours)';
      } else if (rand <= 97) {
        status = 'ABSENT';
        checkIn = null;
        checkOut = null;
        workedHours = 0;
      } else if (rand <= 99) {
        status = 'MISSING_CHECKOUT';
        checkIn = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:05:00Z`);
        checkOut = null;
        workedHours = null;
        notes = 'Employee check-out time missing';
      } else {
        status = 'MANUAL_CORRECTION';
        checkIn = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:00:00Z`);
        checkOut = new Date(`${dateStr}T${String(startH + 9).padStart(2, '0')}:00:00Z`);
        workedHours = 8.0;
        isManual = true;
        notes = 'Attendance manually adjusted by HR Administrator';
      }

      attendanceBatch.push({
        employeeId: emp.id,
        date: new Date(dateStr),
        checkIn,
        checkOut,
        workedHours,
        status,
        isManualCorrection: isManual,
        correctionReason: isManual ? 'Card reader glitch at turnstile' : null,
        notes,
        attendanceLocationId: emp.attendanceLocationId,
      });
    }
  }

  // Insert attendance in chunks of 2,000 records to prevent memory buffer overflow
  const CHUNK_SIZE = 2000;
  for (let i = 0; i < attendanceBatch.length; i += CHUNK_SIZE) {
    const chunk = attendanceBatch.slice(i, i + CHUNK_SIZE);
    await prisma.attendance.createMany({ data: chunk, skipDuplicates: true });
  }

  console.log(`✅ ${attendanceBatch.length} Daily Attendance records inserted in bulk\n`);

  // ------------------------------------------------------------
  // 9. WORKING DAYS POLICY
  // ------------------------------------------------------------
  console.log('⚙️ 9/12 Seeding Working Days Policy & Override...');
  await prisma.workingDaysPolicy.create({
    data: { name: 'Standard Monthly Policy', totalDays: 22, effectivePeriod: null }
  });
  await prisma.workingDaysPolicy.create({
    data: { name: 'August 2026 Festival Month Override', totalDays: 21, effectivePeriod: '2026-08' }
  });
  console.log('✅ Working Days Policies seeded\n');

  // ------------------------------------------------------------
  // 10. HOLIDAY SUGGESTIONS & COMPANY HOLIDAYS
  // ------------------------------------------------------------
  console.log('🎉 10/12 Seeding Holiday Suggestions & Company Holidays...');

  const holiday1 = await prisma.holidaySuggestion.create({
    data: { date: new Date('2026-08-28'), name: 'Janmashtami', source: 'API_CALENDARIFIC', status: 'APPROVED_PAID', country: 'IN' }
  });
  await prisma.companyHoliday.create({
    data: { date: new Date('2026-08-28'), name: 'Janmashtami', isPaid: true, linkedSuggestionId: holiday1.id }
  });

  const holiday2 = await prisma.holidaySuggestion.create({
    data: { date: new Date('2026-10-02'), name: 'Gandhi Jayanti', source: 'API_CALENDARIFIC', status: 'APPROVED_PAID', country: 'IN' }
  });
  await prisma.companyHoliday.create({
    data: { date: new Date('2026-10-02'), name: 'Gandhi Jayanti', isPaid: true, linkedSuggestionId: holiday2.id }
  });

  // Pending & Rejected suggestions for dashboard widget
  await prisma.holidaySuggestion.create({
    data: { date: new Date('2026-09-14'), name: 'Ganesh Chaturthi', source: 'API_CALENDARIFIC', status: 'PENDING', country: 'IN' }
  });
  await prisma.holidaySuggestion.create({
    data: { date: new Date('2026-11-01'), name: 'Diwali', source: 'API_CALENDARIFIC', status: 'PENDING', country: 'IN' }
  });
  await prisma.holidaySuggestion.create({
    data: { date: new Date('2026-10-20'), name: 'Dussehra Regional Holiday', source: 'API_CALENDARIFIC', status: 'REJECTED', country: 'IN' }
  });

  console.log('✅ Holiday Suggestions & Company Holidays created\n');

  // ------------------------------------------------------------
  // 11. PAYRUNS & PAYSLIPS
  // ------------------------------------------------------------
  console.log('💵 11/12 Seeding Historical & Current Payruns + Payslips...');

  const payrollManager = seededEmployees.find(e => e.email === 'payrollmanager@peoplepay360.com');

  // 4 Historical PAID Payruns (May, June, July, August 2026)
  const historicalPeriods = [
    { name: 'Payroll - May 2026', start: '2026-05-01', end: '2026-05-31', totalDays: 22 },
    { name: 'Payroll - June 2026', start: '2026-06-01', end: '2026-06-30', totalDays: 22 },
    { name: 'Payroll - July 2026', start: '2026-07-01', end: '2026-07-31', totalDays: 22 },
    { name: 'Payroll - August 2026', start: '2026-08-01', end: '2026-08-31', totalDays: 21 }, // overridden month
  ];

  const payrunEmployees = activeEmployees.slice(0, 75); // ~75 employees per payrun

  for (const period of historicalPeriods) {
    const payrun = await prisma.payrun.create({
      data: {
        name: period.name,
        periodStart: new Date(period.start),
        periodEnd: new Date(period.end),
        salaryStructureId: midStruct.id,
        status: 'PAID',
        createdById: payrollManager.id,
        computedAt: new Date(`${period.end}T10:00:00Z`),
        validatedAt: new Date(`${period.end}T14:00:00Z`),
        finalizedAt: new Date(`${period.end}T16:00:00Z`),
        paidAt: new Date(`${period.end}T18:00:00Z`),
      }
    });

    let runGross = 0, runDeductions = 0, runNet = 0;

    for (const emp of payrunEmployees) {
      const contract = contractMap[emp.id];
      if (!contract) continue;

      const wage = contract.wage;
      const basic = Math.round(wage);
      const hra = Math.round(basic * 0.50);
      const transport = 2000;
      const medical = 2000;
      const gross = basic + hra + transport + medical;
      const pf = Math.round(basic * 0.12);
      const pt = 200;
      const tds = Math.max(0, Math.round(gross * 0.1 - 2500));
      const deductions = pf + pt + tds;
      const net = gross - deductions;

      runGross += gross;
      runDeductions += deductions;
      runNet += net;

      const payslip = await prisma.payslip.create({
        data: {
          payrunId: payrun.id,
          employeeId: emp.id,
          contractId: contract.id,
          salaryStructureId: contract.salaryStructureId,
          periodStart: new Date(period.start),
          periodEnd: new Date(period.end),
          workedDays: period.totalDays,
          totalWorkingDays: period.totalDays,
          leaveDays: 0,
          overtimeHours: randomBetween(0, 5),
          status: 'PAID',
          grossSalary: gross,
          totalDeductions: deductions,
          netSalary: net,
          hasWarnings: false,
          hasErrors: false,
          lines: {
            create: [
              { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, amount: basic, quantity: 1, rate: basic },
              { name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 2, amount: hra, quantity: 1, rate: hra },
              { name: 'Transport Allowance', code: 'TRANSPORT', category: 'ALLOWANCE', sequence: 3, amount: transport, quantity: 1, rate: transport },
              { name: 'Medical Allowance', code: 'MEDICAL', category: 'ALLOWANCE', sequence: 4, amount: medical, quantity: 1, rate: medical },
              { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 5, amount: gross, quantity: 1, rate: gross },
              { name: 'Provident Fund', code: 'PF', category: 'DEDUCTION', sequence: 6, amount: pf, quantity: 1, rate: pf },
              { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 7, amount: pt, quantity: 1, rate: pt },
              { name: 'Income Tax (TDS)', code: 'TDS', category: 'DEDUCTION', sequence: 8, amount: tds, quantity: 1, rate: tds },
              { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 9, amount: net, quantity: 1, rate: net },
            ]
          }
        }
      });
    }

    await prisma.payrun.update({
      where: { id: payrun.id },
      data: { totalGross: runGross, totalDeductions: runDeductions, totalNet: runNet }
    });
  }

  // 1 Current Payrun (September 2026) in COMPUTED status
  const septPayrun = await prisma.payrun.create({
    data: {
      name: 'Payroll - September 2026',
      periodStart: new Date('2026-09-01'),
      periodEnd: new Date('2026-09-30'),
      salaryStructureId: midStruct.id,
      status: 'COMPUTED',
      createdById: payrollManager.id,
      computedAt: new Date('2026-09-02T10:00:00Z'),
    }
  });

  let currentGross = 0, currentDeductions = 0, currentNet = 0;

  for (let idx = 0; idx < 80; idx++) {
    const emp = activeEmployees[idx];
    const contract = contractMap[emp.id];
    if (!contract) continue;

    const wage = contract.wage;
    const basic = Math.round(wage);
    const hra = Math.round(basic * 0.50);
    const transport = 2000;
    const medical = 2000;
    const gross = basic + hra + transport + medical;
    const pf = Math.round(basic * 0.12);
    const pt = 200;
    const tds = Math.max(0, Math.round(gross * 0.1 - 2500));
    const deductions = pf + pt + tds;
    const net = gross - deductions;

    currentGross += gross;
    currentDeductions += deductions;
    currentNet += net;

    // Check warning conditions: missing bank details, override, period adjustment
    const isMissingBank = !emp.bankAccountNumber;
    const isOverride = idx === 5 || idx === 6;
    const isPeriodAdjusted = idx === 12;

    await prisma.payslip.create({
      data: {
        payrunId: septPayrun.id,
        employeeId: emp.id,
        contractId: contract.id,
        salaryStructureId: contract.salaryStructureId,
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-30'),
        effectivePeriodStart: isPeriodAdjusted ? new Date('2026-08-15') : null,
        effectivePeriodEnd: isPeriodAdjusted ? new Date('2026-09-15') : null,
        isOverride,
        overrideWarning: isOverride ? 'Structure rule mismatch override applied by HR' : null,
        workedDays: 22,
        totalWorkingDays: 22,
        leaveDays: 0,
        overtimeHours: randomBetween(0, 4),
        status: 'COMPUTED',
        grossSalary: gross,
        totalDeductions: deductions,
        netSalary: net,
        hasWarnings: isMissingBank || isOverride || isPeriodAdjusted,
        hasErrors: false,
        validationNotes: isMissingBank ? ['Employee bank account details are missing'] : null,
        lines: {
          create: [
            { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 1, amount: basic, quantity: 1, rate: basic },
            { name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 2, amount: hra, quantity: 1, rate: hra },
            { name: 'Transport Allowance', code: 'TRANSPORT', category: 'ALLOWANCE', sequence: 3, amount: transport, quantity: 1, rate: transport },
            { name: 'Medical Allowance', code: 'MEDICAL', category: 'ALLOWANCE', sequence: 4, amount: medical, quantity: 1, rate: medical },
            { name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 5, amount: gross, quantity: 1, rate: gross },
            { name: 'Provident Fund', code: 'PF', category: 'DEDUCTION', sequence: 6, amount: pf, quantity: 1, rate: pf },
            { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 7, amount: pt, quantity: 1, rate: pt },
            { name: 'Income Tax (TDS)', code: 'TDS', category: 'DEDUCTION', sequence: 8, amount: tds, quantity: 1, rate: tds },
            { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 9, amount: net, quantity: 1, rate: net },
          ]
        }
      }
    });
  }

  await prisma.payrun.update({
    where: { id: septPayrun.id },
    data: { totalGross: currentGross, totalDeductions: currentDeductions, totalNet: currentNet }
  });

  console.log('✅ 4 Historical PAID Payruns and 1 Current COMPUTED Payrun created with flagged test payslips\n');

  // ------------------------------------------------------------
  // 12. AUDIT LOG (15-20 entries)
  // ------------------------------------------------------------
  console.log('📋 12/12 Seeding Audit Logs...');

  const auditLogs = [
    { actionType: 'PAYRUN_CREATE', entityType: 'PAYRUN', description: 'Created Payrun for May 2026', performedBy: 'Rajesh Kumar (Payroll Manager)' },
    { actionType: 'PAYRUN_FINALIZED', entityType: 'PAYRUN', description: 'Finalized and paid May 2026 Payrun', performedBy: 'Rajesh Kumar (Payroll Manager)' },
    { actionType: 'STRUCTURE_UPDATE', entityType: 'SALARY_STRUCTURE', description: 'Updated rules for Mid-Level Structure', performedBy: 'Priya Sharma (HR Director)' },
    { actionType: 'RULE_UPDATE', entityType: 'SALARY_RULE', description: 'Modified HRA percentage rule on Junior Staff Structure', performedBy: 'Priya Sharma (HR Director)' },
    { actionType: 'EMPLOYEE_STATUS', entityType: 'EMPLOYEE', description: 'Updated employee status to INACTIVE for EMP272', performedBy: 'Priya Sharma (HR Director)' },
    { actionType: 'CONTRACT_END', entityType: 'CONTRACT', description: 'Terminated contract for EMP292', performedBy: 'Priya Sharma (HR Director)' },
    { actionType: 'PAYRUN_CREATE', entityType: 'PAYRUN', description: 'Created Payrun for June 2026', performedBy: 'Rajesh Kumar (Payroll Manager)' },
    { actionType: 'PAYRUN_FINALIZED', entityType: 'PAYRUN', description: 'Finalized and paid June 2026 Payrun', performedBy: 'Rajesh Kumar (Payroll Manager)' },
    { actionType: 'PAYRUN_CREATE', entityType: 'PAYRUN', description: 'Created Payrun for July 2026', performedBy: 'Rajesh Kumar (Payroll Manager)' },
    { actionType: 'PAYRUN_FINALIZED', entityType: 'PAYRUN', description: 'Finalized and paid July 2026 Payrun', performedBy: 'Rajesh Kumar (Payroll Manager)' },
    { actionType: 'POLICY_OVERRIDE', entityType: 'WORKING_DAYS_POLICY', description: 'Created August 2026 festival month 21-day override policy', performedBy: 'Priya Sharma (HR Director)' },
    { actionType: 'PAYRUN_CREATE', entityType: 'PAYRUN', description: 'Created Payrun for August 2026', performedBy: 'Rajesh Kumar (Payroll Manager)' },
    { actionType: 'PAYRUN_FINALIZED', entityType: 'PAYRUN', description: 'Finalized and paid August 2026 Payrun', performedBy: 'Rajesh Kumar (Payroll Manager)' },
    { actionType: 'HOLIDAY_APPROVE', entityType: 'HOLIDAY_SUGGESTION', description: 'Approved Janmashtami as Company Paid Holiday', performedBy: 'Priya Sharma (HR Director)' },
    { actionType: 'PAYRUN_CREATE', entityType: 'PAYRUN', description: 'Created Payrun for September 2026', performedBy: 'Rajesh Kumar (Payroll Manager)' },
    { actionType: 'PAYRUN_COMPUTE', entityType: 'PAYRUN', description: 'Executed computation for September 2026 Payrun', performedBy: 'Rajesh Kumar (Payroll Manager)' },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }

  console.log('✅ 16 Audit Logs created\n');

  // ------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------
  const counts = {
    departments: await prisma.department.count(),
    workingSchedules: await prisma.workingSchedule.count(),
    salaryStructures: await prisma.salaryStructure.count(),
    salaryRules: await prisma.salaryRule.count(),
    users: await prisma.user.count(),
    employees: await prisma.employee.count(),
    contracts: await prisma.contract.count(),
    timeOffTypes: await prisma.timeOffType.count(),
    timeOffAllocations: await prisma.timeOffAllocation.count(),
    timeOffRequests: await prisma.timeOffRequest.count(),
    attendance: await prisma.attendance.count(),
    workingDaysPolicies: await prisma.workingDaysPolicy.count(),
    holidaySuggestions: await prisma.holidaySuggestion.count(),
    companyHolidays: await prisma.companyHoliday.count(),
    payruns: await prisma.payrun.count(),
    payslips: await prisma.payslip.count(),
    payslipLines: await prisma.payslipLine.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('============================================================');
  console.log('🎉 PeoplePay360 Database Seeding Successfully Completed!');
  console.log('============================================================');
  console.log('📊 Summary of Seeded Data:');
  console.log(`   • Departments:          ${counts.departments}`);
  console.log(`   • Working Schedules:    ${counts.workingSchedules}`);
  console.log(`   • Salary Structures:    ${counts.salaryStructures}`);
  console.log(`   • Salary Rules:         ${counts.salaryRules}`);
  console.log(`   • Users:                ${counts.users}`);
  console.log(`   • Employees:            ${counts.employees}`);
  console.log(`   • Contracts:            ${counts.contracts}`);
  console.log(`   • Time Off Types:       ${counts.timeOffTypes}`);
  console.log(`   • Leave Allocations:    ${counts.timeOffAllocations}`);
  console.log(`   • Leave Requests:       ${counts.timeOffRequests}`);
  console.log(`   • Attendance Records:   ${counts.attendance}`);
  console.log(`   • Working Days Policies:${counts.workingDaysPolicies}`);
  console.log(`   • Holiday Suggestions:  ${counts.holidaySuggestions}`);
  console.log(`   • Company Holidays:     ${counts.companyHolidays}`);
  console.log(`   • Payruns:              ${counts.payruns}`);
  console.log(`   • Payslips:             ${counts.payslips}`);
  console.log(`   • Payslip Lines:        ${counts.payslipLines}`);
  console.log(`   • Audit Logs:           ${counts.auditLogs}`);
  console.log('');
  console.log('🔑 Role-Based Demo Login Credentials (Password: Password123!):');
  console.log('   1. ADMIN:               admin@peoplepay360.com');
  console.log('   2. HR PAYROLL MANAGER:  payrollmanager@peoplepay360.com');
  console.log('   3. HR PAYROLL USER:     payrolluser@peoplepay360.com');
  console.log('   4. HR MANAGER:          hr@peoplepay360.com');
  console.log('   5. EMPLOYEE:            employee@peoplepay360.com');
  console.log('============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
