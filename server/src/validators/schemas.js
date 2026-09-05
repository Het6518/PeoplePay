const { z } = require('zod');

// ============================================================
// AUTH
// ============================================================

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']).optional(),
});

// ============================================================
// DEPARTMENT
// ============================================================

const DepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100),
  description: z.string().optional().nullable(),
});

// ============================================================
// EMPLOYEE
// ============================================================

const CreateEmployeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required').max(20),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().datetime({ offset: true }).optional().nullable(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  jobPosition: z.string().optional().nullable(),
  employeeType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
  workingScheduleId: z.string().optional().nullable(),
  bankAccountName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
  createUserAccount: z.boolean().optional(),
  userPassword: z.string().min(6).optional().nullable(),
});

const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

// ============================================================
// CONTRACT
// ============================================================

const CreateContractSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  wage: z.number().positive('Wage must be a positive number'),
  salaryStructureId: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
  notes: z.string().optional().nullable(),
});

const UpdateContractSchema = CreateContractSchema.partial();

// ============================================================
// WORKING SCHEDULE
// ============================================================

const WorkingScheduleDaySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().nullable(),
  breakMinutes: z.number().min(0).max(480).default(0),
  isWorkday: z.boolean().default(false),
});

const CreateScheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  type: z.enum(['FIXED', 'FLEXIBLE', 'SHIFT']).optional(),
  days: z.array(WorkingScheduleDaySchema).min(1, 'At least one day must be configured'),
});

const UpdateScheduleSchema = CreateScheduleSchema.partial();

// ============================================================
// ATTENDANCE
// ============================================================

const CreateAttendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  date: z.string().min(1, 'Date is required'),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const CorrectAttendanceSchema = z.object({
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  correctionReason: z.string().min(1, 'Correction reason is required'),
  notes: z.string().optional().nullable(),
});

// ============================================================
// TIME OFF TYPE
// ============================================================

const CreateTimeOffTypeSchema = z.object({
  name: z.string().min(1, 'Leave type name is required'),
  unit: z.enum(['DAYS', 'HOURS']).optional(),
  requiresAllocation: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  payrollIntegration: z.boolean().optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

const UpdateTimeOffTypeSchema = CreateTimeOffTypeSchema.partial();

// ============================================================
// TIME OFF ALLOCATION
// ============================================================

const CreateAllocationSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  timeOffTypeId: z.string().min(1, 'Leave type is required'),
  allocatedAmount: z.number().positive('Allocated amount must be positive'),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().min(1, 'Valid to date is required'),
  notes: z.string().optional().nullable(),
});

const UpdateAllocationSchema = CreateAllocationSchema.partial();

// ============================================================
// TIME OFF REQUEST
// ============================================================

const CreateTimeOffRequestSchema = z.object({
  employeeId: z.string().optional().nullable(),
  timeOffTypeId: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  duration: z.number().positive('Duration must be positive'),
  reason: z.string().optional().nullable(),
});

const ApproveRejectRequestSchema = z.object({
  rejectionReason: z.string().optional().nullable(),
});

// ============================================================
// SALARY STRUCTURE
// ============================================================

const CreateSalaryStructureSchema = z.object({
  name: z.string().min(1, 'Structure name is required'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const UpdateSalaryStructureSchema = CreateSalaryStructureSchema.partial();

// ============================================================
// SALARY RULE
// ============================================================

const CreateSalaryRuleSchema = z.object({
  salaryStructureId: z.string().min(1, 'Salary structure is required'),
  name: z.string().min(1, 'Rule name is required'),
  code: z.string().min(1, 'Rule code is required').max(20).toUpperCase(),
  category: z.enum(['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET']),
  sequence: z.number().int().min(1),
  computationType: z.enum(['FIXED', 'PERCENTAGE', 'FORMULA']),
  fixedAmount: z.number().optional().nullable(),
  percentage: z.number().optional().nullable(),
  percentageBase: z.string().optional().nullable(),
  formula: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const UpdateSalaryRuleSchema = CreateSalaryRuleSchema.partial();

// ============================================================
// PAYRUN
// ============================================================

const CreatePayrunSchema = z.object({
  name: z.string().min(1, 'Payrun name is required'),
  periodStart: z.string().min(1, 'Period start is required'),
  periodEnd: z.string().min(1, 'Period end is required'),
  salaryStructureId: z.string().min(1, 'Salary structure is required'),
  employeeIds: z.array(z.string()).min(1, 'At least one employee must be selected'),
  notes: z.string().optional().nullable(),
});

const SelectEmployeesSchema = z.object({
  employeeIds: z.array(z.string()).min(1, 'At least one employee must be selected'),
});

module.exports = {
  LoginSchema,
  RegisterSchema,
  DepartmentSchema,
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  CreateContractSchema,
  UpdateContractSchema,
  CreateScheduleSchema,
  UpdateScheduleSchema,
  CreateAttendanceSchema,
  CorrectAttendanceSchema,
  CreateTimeOffTypeSchema,
  UpdateTimeOffTypeSchema,
  CreateAllocationSchema,
  UpdateAllocationSchema,
  CreateTimeOffRequestSchema,
  ApproveRejectRequestSchema,
  CreateSalaryStructureSchema,
  UpdateSalaryStructureSchema,
  CreateSalaryRuleSchema,
  UpdateSalaryRuleSchema,
  CreatePayrunSchema,
  SelectEmployeesSchema,
};
