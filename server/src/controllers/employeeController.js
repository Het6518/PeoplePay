const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { CreateEmployeeSchema, UpdateEmployeeSchema } = require('../validators/schemas');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const EMPLOYEE_SELECT = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  joiningDate: true,
  jobPosition: true,
  employeeType: true,
  status: true,
  departmentId: true,
  managerId: true,
  workingScheduleId: true,
  bankAccountName: true,
  bankAccountNumber: true,
  bankName: true,
  panNumber: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, firstName: true, lastName: true } },
  workingSchedule: { select: { id: true, name: true, weeklyHours: true } },
  user: { select: { id: true, email: true, role: true } },
  contracts: {
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      salaryStructureId: true,
      salaryStructure: {
        select: {
          id: true,
          name: true,
          description: true,
          rules: {
            where: { isActive: true },
            orderBy: { sequence: 'asc' },
            select: {
              id: true,
              name: true,
              code: true,
              category: true,
              sequence: true,
              computationType: true,
              fixedAmount: true,
              percentage: true,
              percentageBase: true,
              formula: true,
            },
          },
        },
      },
      position: true,
      wage: true,
    },
    orderBy: { startDate: 'desc' },
  },
  _count: {
    select: {
      contracts: true,
      attendance: true,
      timeOffRequests: true,
      timeOffAllocations: true,
      payslips: true,
    },
  },
};

// GET /api/employees
const getEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, departmentId, status, employeeType } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { jobPosition: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (employeeType) where.employeeType = employeeType;

    // EMPLOYEE role can only see their own record
    if (req.user.role === 'EMPLOYEE') {
      if (!req.user.employeeId) return sendSuccess(res, []);
      where.id = req.user.employeeId;
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        select: EMPLOYEE_SELECT,
      }),
      prisma.employee.count({ where }),
    ]);

    return sendPaginated(res, employees, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id
const getEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    // EMPLOYEE can only see own record
    if (req.user.role === 'EMPLOYEE' && req.user.employeeId !== id) {
      return sendError(res, 'Access denied.', 403);
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: EMPLOYEE_SELECT,
    });

    if (!employee) return sendError(res, 'Employee not found.', 404);
    return sendSuccess(res, employee);
  } catch (err) {
    next(err);
  }
};

// POST /api/employees
const createEmployee = async (req, res, next) => {
  try {
    const data = CreateEmployeeSchema.parse(req.body);
    const { createUserAccount, userPassword, password, ...employeeData } = data;
    const initialPassword = userPassword || password;

    // Check unique constraints
    const existing = await prisma.employee.findFirst({
      where: {
        OR: [{ employeeCode: employeeData.employeeCode }, { email: employeeData.email }],
      },
    });
    if (existing) {
      return sendError(
        res,
        existing.employeeCode === employeeData.employeeCode
          ? 'Employee code already exists.'
          : 'Email already used by another employee.',
        409
      );
    }

    let userId = null;

    // Optionally create a user account
    if (createUserAccount && initialPassword) {
      const existingUser = await prisma.user.findUnique({ where: { email: employeeData.email } });
      if (existingUser) {
        return sendError(res, 'A user account with this email already exists.', 409);
      }
      const passwordHash = await bcrypt.hash(initialPassword, 12);
      const user = await prisma.user.create({
        data: { email: employeeData.email, passwordHash, role: 'EMPLOYEE' },
      });
      userId = user.id;
    }

    const employee = await prisma.employee.create({
      data: {
        ...employeeData,
        joiningDate: new Date(employeeData.joiningDate),
        dateOfBirth: employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : null,
        userId,
      },
      select: EMPLOYEE_SELECT,
    });

    return sendSuccess(res, employee, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res, next) => {
  try {
    const data = UpdateEmployeeSchema.parse(req.body);
    const { createUserAccount, userPassword, ...employeeData } = data;

    if (employeeData.joiningDate) employeeData.joiningDate = new Date(employeeData.joiningDate);
    if (employeeData.dateOfBirth) employeeData.dateOfBirth = new Date(employeeData.dateOfBirth);

    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: employeeData,
      select: EMPLOYEE_SELECT,
    });

    return sendSuccess(res, employee);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { payslips: true } } },
    });

    if (!employee) return sendError(res, 'Employee not found.', 404);

    if (employee._count.payslips > 0) {
      return sendError(
        res,
        'Cannot delete employee with payroll history. Consider marking as Terminated instead.',
        400
      );
    }

    await prisma.employee.delete({ where: { id: req.params.id } });
    return sendSuccess(res, { message: 'Employee deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id/contracts
const getEmployeeContracts = async (req, res, next) => {
  try {
    const contracts = await prisma.contract.findMany({
      where: { employeeId: req.params.id },
      orderBy: { startDate: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    });
    return sendSuccess(res, contracts);
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id/attendance
const getEmployeeAttendance = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { employeeId: req.params.id };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    return sendPaginated(res, records, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id/payslips
const getEmployeePayslips = async (req, res, next) => {
  try {
    const payslips = await prisma.payslip.findMany({
      where: { employeeId: req.params.id },
      orderBy: { periodStart: 'desc' },
      include: {
        payrun: { select: { id: true, name: true, status: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    });
    return sendSuccess(res, payslips);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeContracts,
  getEmployeeAttendance,
  getEmployeePayslips,
};
