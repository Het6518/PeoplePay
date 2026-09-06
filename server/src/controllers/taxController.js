const prisma = require('../config/prisma');
const indianTaxService = require('../services/indianTaxService');
const { sendSuccess, sendError } = require('../utils/response');

// POST /api/payroll/tax/calculate
const calculateTax = async (req, res, next) => {
  try {
    const { grossAnnual, regime = 'NEW', financialYear = '2024-25', declarations = {}, basicSalaryAnnual } = req.body;

    if (grossAnnual === undefined || grossAnnual === null) {
      return sendError(res, 'Gross annual income is required.', 400);
    }

    let result;
    if (regime === 'OLD') {
      result = indianTaxService.calculateOldRegimeTax({
        grossAnnual: Number(grossAnnual),
        declarations,
        basicSalaryAnnual: Number(basicSalaryAnnual) || 0,
      });
    } else {
      result = indianTaxService.calculateNewRegimeTax({
        grossAnnual: Number(grossAnnual),
        financialYear,
      });
    }

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// POST /api/payroll/tax/compare
const compareRegimes = async (req, res, next) => {
  try {
    const { grossAnnual, financialYear = '2024-25', declarations = {}, basicSalaryAnnual } = req.body;

    if (grossAnnual === undefined || grossAnnual === null) {
      return sendError(res, 'Gross annual income is required.', 400);
    }

    const comparison = indianTaxService.compareTaxRegimes({
      grossAnnual: Number(grossAnnual),
      financialYear,
      declarations,
      basicSalaryAnnual: Number(basicSalaryAnnual) || 0,
    });

    return sendSuccess(res, comparison);
  } catch (err) {
    next(err);
  }
};

// GET /api/payroll/tax/employee/:id
const getEmployeeTaxProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { financialYear = '2024-25' } = req.query;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        contracts: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found.', 404);
    }

    const contract = employee.contracts?.[0];
    const monthlyWage = contract?.wage || 0;
    const annualGross = monthlyWage * 12;
    const annualBasic = annualGross * 0.5; // Standard 50% Basic in India
    const annualPF = Math.min(150000, Math.round(annualBasic * 0.12)); // 12% PF

    const initialDeclarations = {
      section80C: annualPF,
      pfAnnual: annualPF,
      section80DSelf: 0,
      section80DParents: 0,
      homeLoanInterest: 0,
      section80CCDNPS: 0,
      rentPaidAnnual: 0,
      actualHraReceived: Math.round(annualBasic * 0.5),
      isMetroCity: false,
    };

    const comparison = indianTaxService.compareTaxRegimes({
      grossAnnual: annualGross,
      financialYear,
      declarations: initialDeclarations,
      basicSalaryAnnual: annualBasic,
    });

    return sendSuccess(res, {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeCode,
        department: employee.department?.name || 'General',
        jobPosition: employee.jobPosition || 'Employee',
      },
      contract: contract ? {
        id: contract.id,
        monthlyWage,
        annualGross,
        annualBasic,
        annualPF,
      } : null,
      initialDeclarations,
      comparison,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  calculateTax,
  compareRegimes,
  getEmployeeTaxProfile,
};
