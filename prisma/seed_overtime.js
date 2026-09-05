const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const prisma = new PrismaClient();
const overtimeService = require('../server/src/services/overtimeService');

async function seedOvertimeUsers() {
  console.log('=== SEEDING DEMO OVERTIME USERS & SCENARIOS ===\n');

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Get or create Department & Schedule
  let dept = await prisma.department.findFirst({ where: { name: 'Engineering' } });
  if (!dept) {
    dept = await prisma.department.create({ data: { name: 'Engineering', description: 'Product & Tech' } });
  }

  let schedule = await prisma.workingSchedule.findFirst({
    where: { name: 'Standard 40h Working Schedule' },
    include: { days: true },
  });

  if (!schedule) {
    schedule = await prisma.workingSchedule.create({
      data: {
        name: 'Standard 40h Working Schedule',
        weeklyHours: 40,
        overtimeMultiplier: 1.5,
        weekendOvertimeMultiplier: 2.0,
        holidayOvertimeMultiplier: 2.0,
        overtimeRequiresApproval: true,
        days: {
          create: [
            { dayOfWeek: 1, isWorkday: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
            { dayOfWeek: 2, isWorkday: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
            { dayOfWeek: 3, isWorkday: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
            { dayOfWeek: 4, isWorkday: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
            { dayOfWeek: 5, isWorkday: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
            { dayOfWeek: 0, isWorkday: false, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
            { dayOfWeek: 6, isWorkday: false, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
          ],
        },
      },
      include: { days: true },
    });
  }

  let salaryStructure = await prisma.salaryStructure.findFirst({
    where: { isActive: true },
  });

  // 2. Demo Personas
  const personas = [
    {
      email: 'het.patel@peoplepay360.com',
      code: 'EMP-OT-001',
      firstName: 'Het',
      lastName: 'Patel',
      position: 'Senior Software Engineer',
      wage: 85000,
      role: 'EMPLOYEE',
      records: [
        {
          date: '2026-09-04', // Friday
          checkIn: '09:00',
          checkOut: '20:00',
          workedHours: 10,
          expectedHours: 8,
          overtimeHours: 2,
          multiplier: 1.5,
          status: 'APPROVED',
          approvedByName: 'HR Payroll Manager',
          reason: 'Production release deployment overtime',
        },
        {
          date: '2026-09-06', // Sunday (Weekend 2.0x)
          checkIn: '10:00',
          checkOut: '16:00',
          workedHours: 6,
          expectedHours: 0,
          overtimeHours: 6,
          multiplier: 2.0,
          status: 'APPROVED',
          approvedByName: 'HR Payroll Manager',
          reason: 'Emergency database migration support',
        },
        {
          date: '2026-09-09', // Wednesday
          checkIn: '09:00',
          checkOut: '21:00',
          workedHours: 11,
          expectedHours: 8,
          overtimeHours: 3,
          multiplier: 1.5,
          status: 'PENDING',
          reason: 'Sprint closure critical bug fixes',
        },
      ],
    },
    {
      email: 'ananya.sharma@peoplepay360.com',
      code: 'EMP-OT-002',
      firstName: 'Ananya',
      lastName: 'Sharma',
      position: 'QA Automation Engineer',
      wage: 65000,
      role: 'EMPLOYEE',
      records: [
        {
          date: '2026-09-07', // Monday
          checkIn: '09:00',
          checkOut: '20:30',
          workedHours: 10.5,
          expectedHours: 8,
          overtimeHours: 2.5,
          multiplier: 1.5,
          status: 'PENDING',
          reason: 'Automated regression test suite runs',
        },
        {
          date: '2026-09-08', // Tuesday
          checkIn: '09:00',
          checkOut: '19:30',
          workedHours: 9.5,
          expectedHours: 8,
          overtimeHours: 1.5,
          multiplier: 1.5,
          status: 'REJECTED',
          rejectedByName: 'HR Manager',
          rejectionReason: 'Overtime was not pre-approved by the QA Team Lead.',
        },
      ],
    },
    {
      email: 'rahul.verma@peoplepay360.com',
      code: 'EMP-OT-003',
      firstName: 'Rahul',
      lastName: 'Verma',
      position: 'Senior Financial Analyst',
      wage: 75000,
      role: 'EMPLOYEE',
      records: [
        {
          date: '2026-09-05', // Saturday (Weekend 2.0x)
          checkIn: '10:00',
          checkOut: '18:00',
          workedHours: 8,
          expectedHours: 0,
          overtimeHours: 5, // Manually corrected down to 5h
          originalHours: 8,
          multiplier: 2.0,
          status: 'APPROVED',
          approvedByName: 'Finance Director',
          isManualCorrection: true,
          correctedByName: 'HR Compliance Officer',
          correctionReason: 'Adjusted from 8h to 5h billable per client project agreement.',
        },
      ],
    },
  ];

  for (const p of personas) {
    console.log(`👤 Seeding persona: ${p.firstName} ${p.lastName} (${p.email})...`);

    // User
    let user = await prisma.user.findUnique({ where: { email: p.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: p.email,
          passwordHash: defaultPasswordHash,
          role: p.role,
          isActive: true,
        },
      });
    }

    // Employee
    let emp = await prisma.employee.findUnique({ where: { employeeCode: p.code } });
    if (!emp) {
      emp = await prisma.employee.create({
        data: {
          employeeCode: p.code,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          userId: user.id,
          departmentId: dept.id,
          jobPosition: p.position,
          joiningDate: new Date('2024-01-15T00:00:00.000Z'),
          workingScheduleId: schedule.id,
          bankAccountName: `${p.firstName} ${p.lastName}`,
          bankAccountNumber: `HDFC${Math.floor(100000000 + Math.random() * 900000000)}`,
          bankName: 'HDFC Bank',
          panNumber: 'ABCDE1234F',
          status: 'ACTIVE',
        },
      });
    }

    // Active Contract
    let contract = await prisma.contract.findFirst({ where: { employeeId: emp.id, status: 'ACTIVE' } });
    if (!contract) {
      contract = await prisma.contract.create({
        data: {
          employeeId: emp.id,
          startDate: new Date('2024-01-15T00:00:00.000Z'),
          departmentId: dept.id,
          position: p.position,
          wage: p.wage,
          salaryStructureId: salaryStructure?.id,
          status: 'ACTIVE',
        },
      });
    }

    // Seed Attendance & Overtime records
    const hourlyRate = overtimeService.calculateHourlyRate(p.wage, 40);

    for (const rec of p.records) {
      const dateObj = new Date(`${rec.date}T00:00:00.000Z`);
      const checkInObj = new Date(`${rec.date}T${rec.checkIn}:00.000Z`);
      const checkOutObj = new Date(`${rec.date}T${rec.checkOut}:00.000Z`);

      // Clean existing
      await prisma.overtime.deleteMany({ where: { employeeId: emp.id, date: dateObj } });
      await prisma.attendance.deleteMany({ where: { employeeId: emp.id, date: dateObj } });

      const att = await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date: dateObj,
          checkIn: checkInObj,
          checkOut: checkOutObj,
          workedHours: rec.workedHours,
          status: 'OVERTIME',
        },
      });

      const overtimeRate = Math.round(hourlyRate * rec.multiplier * 100) / 100;
      const overtimeAmount = Math.round(rec.overtimeHours * overtimeRate * 100) / 100;

      await prisma.overtime.create({
        data: {
          employeeId: emp.id,
          attendanceId: att.id,
          date: dateObj,
          expectedHours: rec.expectedHours,
          actualHours: rec.workedHours,
          overtimeHours: rec.overtimeHours,
          hourlyRate,
          multiplier: rec.multiplier,
          overtimeRate,
          overtimeAmount,
          status: rec.status,
          reason: rec.reason,
          approvedByName: rec.status === 'APPROVED' ? rec.approvedByName : null,
          approvedAt: rec.status === 'APPROVED' ? new Date() : null,
          rejectedByName: rec.status === 'REJECTED' ? rec.rejectedByName : null,
          rejectedAt: rec.status === 'REJECTED' ? new Date() : null,
          rejectionReason: rec.status === 'REJECTED' ? rec.rejectionReason : null,
          isManualCorrection: rec.isManualCorrection || false,
          originalHours: rec.originalHours || null,
          correctedByName: rec.correctedByName || null,
          correctionReason: rec.correctionReason || null,
          correctedAt: rec.isManualCorrection ? new Date() : null,
        },
      });

      console.log(`   ✔ Added ${rec.date} OT: ${rec.overtimeHours}h (${rec.status}) -> Amount: ₹${overtimeAmount}`);
    }
  }

  console.log('\n✅ Demo Overtime Users successfully seeded!\n');
}

seedOvertimeUsers()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
