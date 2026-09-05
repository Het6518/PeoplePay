const prisma = require('../config/prisma');
const { CreateSalaryStructureSchema, UpdateSalaryStructureSchema, CreateSalaryRuleSchema, UpdateSalaryRuleSchema } = require('../validators/schemas');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// ============================================================
// SALARY STRUCTURES
// ============================================================

const getSalaryStructures = async (req, res, next) => {
  try {
    const structures = await prisma.salaryStructure.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { rules: true, contracts: true } },
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
            isActive: true,
          },
        },
      },
    });
    return sendSuccess(res, structures);
  } catch (err) {
    next(err);
  }
};

const getSalaryStructure = async (req, res, next) => {
  try {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id },
      include: {
        rules: { orderBy: { sequence: 'asc' } },
        _count: { select: { contracts: true } },
      },
    });
    if (!structure) return sendError(res, 'Salary structure not found.', 404);
    return sendSuccess(res, structure);
  } catch (err) {
    next(err);
  }
};

const createSalaryStructure = async (req, res, next) => {
  try {
    const data = CreateSalaryStructureSchema.parse(req.body);
    const structure = await prisma.salaryStructure.create({ data });
    return sendSuccess(res, structure, 201);
  } catch (err) {
    next(err);
  }
};

const updateSalaryStructure = async (req, res, next) => {
  try {
    const data = UpdateSalaryStructureSchema.parse(req.body);
    const structure = await prisma.salaryStructure.update({
      where: { id: req.params.id },
      data,
    });
    return sendSuccess(res, structure);
  } catch (err) {
    next(err);
  }
};

const deleteSalaryStructure = async (req, res, next) => {
  try {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { contracts: true, payruns: true } } },
    });
    if (!structure) return sendError(res, 'Salary structure not found.', 404);
    if (structure._count.payruns > 0) {
      return sendError(res, 'Cannot delete a salary structure that has been used in payruns.', 400);
    }
    await prisma.salaryStructure.delete({ where: { id: req.params.id } });
    return sendSuccess(res, { message: 'Salary structure deleted.' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// SALARY RULES
// ============================================================

const getSalaryRules = async (req, res, next) => {
  try {
    const { salaryStructureId } = req.query;
    const where = salaryStructureId ? { salaryStructureId } : {};
    const rules = await prisma.salaryRule.findMany({
      where,
      orderBy: [{ salaryStructureId: 'asc' }, { sequence: 'asc' }],
      include: {
        salaryStructure: { select: { id: true, name: true } },
      },
    });
    return sendSuccess(res, rules);
  } catch (err) {
    next(err);
  }
};

const getSalaryRule = async (req, res, next) => {
  try {
    const rule = await prisma.salaryRule.findUnique({
      where: { id: req.params.id },
      include: { salaryStructure: { select: { id: true, name: true } } },
    });
    if (!rule) return sendError(res, 'Salary rule not found.', 404);
    return sendSuccess(res, rule);
  } catch (err) {
    next(err);
  }
};

const createSalaryRule = async (req, res, next) => {
  try {
    const data = CreateSalaryRuleSchema.parse(req.body);

    // Validate computation type fields
    if (data.computationType === 'FIXED' && data.fixedAmount == null && data.category !== 'BASIC') {
      return sendError(res, 'Fixed amount is required for FIXED computation type.', 400);
    }
    if (data.computationType === 'PERCENTAGE' && (data.percentage == null || !data.percentageBase)) {
      return sendError(res, 'Percentage and base rule code are required for PERCENTAGE computation.', 400);
    }
    if (data.computationType === 'FORMULA' && !data.formula) {
      return sendError(res, 'Formula is required for FORMULA computation type.', 400);
    }

    const rule = await prisma.salaryRule.create({
      data,
      include: { salaryStructure: { select: { id: true, name: true } } },
    });

    return sendSuccess(res, rule, 201);
  } catch (err) {
    next(err);
  }
};

const updateSalaryRule = async (req, res, next) => {
  try {
    const data = UpdateSalaryRuleSchema.parse(req.body);
    const rule = await prisma.salaryRule.update({
      where: { id: req.params.id },
      data,
    });
    return sendSuccess(res, rule);
  } catch (err) {
    next(err);
  }
};

const deleteSalaryRule = async (req, res, next) => {
  try {
    const rule = await prisma.salaryRule.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { payslipLines: true } } },
    });
    if (!rule) return sendError(res, 'Salary rule not found.', 404);
    if (rule._count.payslipLines > 0) {
      return sendError(res, 'Cannot delete rule that has been used in payslips.', 400);
    }
    await prisma.salaryRule.delete({ where: { id: req.params.id } });
    return sendSuccess(res, { message: 'Salary rule deleted.' });
  } catch (err) {
    next(err);
  }
};

// Reorder rules
const reorderRules = async (req, res, next) => {
  try {
    const { rules } = req.body; // Array of { id, sequence }
    if (!Array.isArray(rules)) return sendError(res, 'Rules array required.', 400);

    await prisma.$transaction(
      rules.map((r) =>
        prisma.salaryRule.update({
          where: { id: r.id },
          data: { sequence: r.sequence },
        })
      )
    );

    return sendSuccess(res, { message: 'Rules reordered successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSalaryStructures,
  getSalaryStructure,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  getSalaryRules,
  getSalaryRule,
  createSalaryRule,
  updateSalaryRule,
  deleteSalaryRule,
  reorderRules,
};
