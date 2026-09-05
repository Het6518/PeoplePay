const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { LoginSchema, RegisterSchema } = require('../validators/schemas');
const { sendSuccess, sendError } = require('../utils/response');
const { createError } = require('../middleware/errorHandler');

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    // Find linked employee if any
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    });

    const payload = {
      userId: user.id,
      role: user.role,
      employeeId: employee?.id || null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: employee || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register (ADMIN only in production — open for seeding)
const register = async (req, res, next) => {
  try {
    const { email, password, role } = RegisterSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return sendError(res, 'An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash, role: role || 'EMPLOYEE' },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return sendSuccess(res, user, 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    });

    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      include: { department: true },
    });

    return sendSuccess(res, { ...user, employee: employee || null });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, getMe };
