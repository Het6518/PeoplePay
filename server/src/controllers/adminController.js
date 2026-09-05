const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { DepartmentSchema } = require('../validators/schemas');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// ============================================================
// DEPARTMENTS
// ============================================================

const getDepartments = async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { employees: true } },
      },
    });
    return sendSuccess(res, departments);
  } catch (err) {
    next(err);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const data = DepartmentSchema.parse(req.body);
    const dept = await prisma.department.create({ data });
    return sendSuccess(res, dept, 201);
  } catch (err) {
    next(err);
  }
};

const getDepartment = async (req, res, next) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { employees: true } } },
    });
    if (!dept) return sendError(res, 'Department not found.', 404);
    return sendSuccess(res, dept);
  } catch (err) {
    next(err);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const data = DepartmentSchema.partial().parse(req.body);
    const dept = await prisma.department.update({ where: { id: req.params.id }, data });
    return sendSuccess(res, dept);
  } catch (err) {
    next(err);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { employees: true } } },
    });
    if (!dept) return sendError(res, 'Department not found.', 404);
    if (dept._count.employees > 0) {
      return sendError(res, 'Cannot delete department with active employees.', 400);
    }
    await prisma.department.delete({ where: { id: req.params.id } });
    return sendSuccess(res, { message: 'Department deleted.' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// USERS (Admin only)
// ============================================================

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return sendPaginated(res, users, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return sendError(res, 'Email and password are required.', 400);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return sendError(res, 'User with this email already exists.', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: role || 'EMPLOYEE' },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return sendSuccess(res, user, 201);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { role, isActive, password } = req.body;
    const data = {};
    if (role) data.role = role;
    if (typeof isActive === 'boolean') data.isActive = isActive;
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, role: true, isActive: true, updatedAt: true },
    });

    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  getUsers,
  createUser,
  updateUser,
};
