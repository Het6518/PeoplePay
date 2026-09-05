const prisma = require('../config/prisma');
const { CreateContractSchema, UpdateContractSchema } = require('../validators/schemas');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// GET /api/contracts
const getContracts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, employeeId, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (search) {
      where.OR = [{ position: { contains: search, mode: 'insensitive' } }];
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { startDate: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          department: { select: { id: true, name: true } },
          salaryStructure: { select: { id: true, name: true } },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    return sendPaginated(res, contracts, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// GET /api/contracts/:id
const getContract = async (req, res, next) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        department: { select: { id: true, name: true } },
        salaryStructure: {
          include: { rules: { orderBy: { sequence: 'asc' } } },
        },
      },
    });
    if (!contract) return sendError(res, 'Contract not found.', 404);
    return sendSuccess(res, contract);
  } catch (err) {
    next(err);
  }
};

// POST /api/contracts
const createContract = async (req, res, next) => {
  try {
    const data = CreateContractSchema.parse(req.body);

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;

    if (endDate && endDate <= startDate) {
      return sendError(res, 'Contract end date must be after start date.', 400);
    }

    // Check for overlapping active contracts
    const overlapping = await prisma.contract.findFirst({
      where: {
        employeeId: data.employeeId,
        status: { in: ['ACTIVE', 'DRAFT'] },
        AND: [
          { startDate: { lte: endDate || new Date('2099-12-31') } },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: startDate } },
            ],
          },
        ],
        NOT: { id: undefined },
      },
    });

    if (overlapping) {
      return sendError(
        res,
        `Overlapping contract detected. Employee already has contract #${overlapping.id} that overlaps this period.`,
        409
      );
    }

    const contract = await prisma.contract.create({
      data: {
        ...data,
        startDate,
        endDate,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    });

    return sendSuccess(res, contract, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/contracts/:id
const updateContract = async (req, res, next) => {
  try {
    const data = UpdateContractSchema.parse(req.body);

    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    // Prevent editing PAID historical contracts
    const existing = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!existing) return sendError(res, 'Contract not found.', 404);

    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    });

    return sendSuccess(res, contract);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/contracts/:id
const deleteContract = async (req, res, next) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { payslips: true } } },
    });

    if (!contract) return sendError(res, 'Contract not found.', 404);

    if (contract._count.payslips > 0) {
      return sendError(res, 'Cannot delete contract used in payroll history.', 400);
    }

    await prisma.contract.delete({ where: { id: req.params.id } });
    return sendSuccess(res, { message: 'Contract deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getContracts, getContract, createContract, updateContract, deleteContract };
