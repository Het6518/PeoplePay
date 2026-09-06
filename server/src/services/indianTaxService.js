/**
 * PeoplePay360 - Indian Income Tax & TDS Calculation Service
 * 
 * Implements real-time income tax computation for India (FY 2024-25 & FY 2025-26)
 * supporting New Tax Regime (Section 115BAC) and Old Tax Regime with:
 * - Standard Deduction (₹75,000 New / ₹50,000 Old)
 * - Section 87A Tax Rebate (up to ₹25,000/₹60,000 New / ₹12,500 Old)
 * - Section 80C, 80D, 80CCD(1B), 24(b) Home Loan, and HRA Section 10(13A)
 * - 4% Health & Education Cess
 * - Monthly TDS projection
 */

/**
 * Calculate tax under the New Tax Regime (Section 115BAC)
 *
 * @param {Object} params
 * @param {number} params.grossAnnual - Total annual gross earnings / CTC
 * @param {string} [params.financialYear='2024-25'] - '2024-25' or '2025-26'
 * @param {number} [params.customStandardDeduction] - Standard deduction override (default ₹75,000)
 * @returns {Object} Full breakdown of new regime tax calculation
 */
function calculateNewRegimeTax({ grossAnnual = 0, financialYear = '2024-25', customStandardDeduction = null }) {
  const gross = Math.max(0, Number(grossAnnual) || 0);
  const standardDeduction = customStandardDeduction !== null ? customStandardDeduction : 75000;
  const taxableIncome = Math.max(0, gross - standardDeduction);

  const slabs = [];
  let rawTax = 0;

  if (financialYear === '2025-26') {
    // Union Budget 2025 Slabs for FY 2025-26 (AY 2026-27)
    const slabDefs = [
      { min: 0, max: 400000, rate: 0, label: 'Up to ₹4,00,000' },
      { min: 400000, max: 800000, rate: 0.05, label: '₹4,00,001 to ₹8,00,000' },
      { min: 800000, max: 1200000, rate: 0.10, label: '₹8,00,001 to ₹12,00,000' },
      { min: 1200000, max: 1600000, rate: 0.15, label: '₹12,00,001 to ₹16,00,000' },
      { min: 1600000, max: 2000000, rate: 0.20, label: '₹16,00,001 to ₹20,00,000' },
      { min: 2000000, max: 2400000, rate: 0.25, label: '₹20,00,001 to ₹24,00,000' },
      { min: 2400000, max: Infinity, rate: 0.30, label: 'Above ₹24,00,000' },
    ];

    for (const def of slabDefs) {
      if (taxableIncome > def.min) {
        const taxableInThisSlab = Math.min(taxableIncome, def.max) - def.min;
        const taxInThisSlab = Math.round(taxableInThisSlab * def.rate * 100) / 100;
        rawTax += taxInThisSlab;
        slabs.push({
          label: def.label,
          ratePercent: def.rate * 100,
          taxableAmount: taxableInThisSlab,
          taxAmount: taxInThisSlab,
        });
      } else {
        slabs.push({
          label: def.label,
          ratePercent: def.rate * 100,
          taxableAmount: 0,
          taxAmount: 0,
        });
      }
    }

    // Section 87A Rebate for FY 2025-26: Taxable income up to ₹12,00,000 gets full rebate (up to ₹60,000)
    let rebate87A = 0;
    if (taxableIncome <= 1200000) {
      rebate87A = rawTax;
    }

    const taxAfterRebate = Math.max(0, rawTax - rebate87A);
    const cess = Math.round(taxAfterRebate * 0.04 * 100) / 100;
    const totalTax = Math.round(taxAfterRebate + cess);
    const monthlyTDS = Math.round((totalTax / 12) * 100) / 100;

    return {
      regime: 'NEW',
      financialYear,
      grossAnnual: gross,
      standardDeduction,
      otherDeductions: 0,
      totalDeductions: standardDeduction,
      taxableIncome,
      slabs,
      rawTax,
      rebate87A,
      taxAfterRebate,
      cess,
      totalTax,
      monthlyTDS,
      effectiveTaxRate: gross > 0 ? Math.round((totalTax / gross) * 10000) / 100 : 0,
    };
  } else {
    // Budget 2024 Slabs for FY 2024-25 (AY 2025-26)
    const slabDefs = [
      { min: 0, max: 300000, rate: 0, label: 'Up to ₹3,00,000' },
      { min: 300000, max: 700000, rate: 0.05, label: '₹3,00,001 to ₹7,00,000' },
      { min: 700000, max: 1000000, rate: 0.10, label: '₹7,00,001 to ₹10,00,000' },
      { min: 1000000, max: 1200000, rate: 0.15, label: '₹10,00,001 to ₹12,00,000' },
      { min: 1200000, max: 1500000, rate: 0.20, label: '₹12,00,001 to ₹15,00,000' },
      { min: 1500000, max: Infinity, rate: 0.30, label: 'Above ₹15,00,000' },
    ];

    for (const def of slabDefs) {
      if (taxableIncome > def.min) {
        const taxableInThisSlab = Math.min(taxableIncome, def.max) - def.min;
        const taxInThisSlab = Math.round(taxableInThisSlab * def.rate * 100) / 100;
        rawTax += taxInThisSlab;
        slabs.push({
          label: def.label,
          ratePercent: def.rate * 100,
          taxableAmount: taxableInThisSlab,
          taxAmount: taxInThisSlab,
        });
      } else {
        slabs.push({
          label: def.label,
          ratePercent: def.rate * 100,
          taxableAmount: 0,
          taxAmount: 0,
        });
      }
    }

    // Section 87A Rebate for FY 2024-25: Taxable income up to ₹7,00,000 gets full rebate (up to ₹25,000)
    let rebate87A = 0;
    if (taxableIncome <= 700000) {
      rebate87A = Math.min(rawTax, 25000);
    } else if (taxableIncome > 700000 && taxableIncome <= 727777) {
      // Marginal Relief: Tax payable cannot exceed income exceeding ₹7,00,000
      const excessIncome = taxableIncome - 700000;
      if (rawTax > excessIncome) {
        rebate87A = rawTax - excessIncome;
      }
    }

    const taxAfterRebate = Math.max(0, rawTax - rebate87A);
    const cess = Math.round(taxAfterRebate * 0.04 * 100) / 100;
    const totalTax = Math.round(taxAfterRebate + cess);
    const monthlyTDS = Math.round((totalTax / 12) * 100) / 100;

    return {
      regime: 'NEW',
      financialYear: '2024-25',
      grossAnnual: gross,
      standardDeduction,
      otherDeductions: 0,
      totalDeductions: standardDeduction,
      taxableIncome,
      slabs,
      rawTax,
      rebate87A,
      taxAfterRebate,
      cess,
      totalTax,
      monthlyTDS,
      effectiveTaxRate: gross > 0 ? Math.round((totalTax / gross) * 10000) / 100 : 0,
    };
  }
}

/**
 * Calculate HRA exemption under Section 10(13A)
 */
function calculateHRAExemption({ actualHraReceived = 0, rentPaidAnnual = 0, basicSalaryAnnual = 0, isMetroCity = false }) {
  if (rentPaidAnnual <= 0 || actualHraReceived <= 0 || basicSalaryAnnual <= 0) return 0;
  
  const excessRent = Math.max(0, rentPaidAnnual - (0.10 * basicSalaryAnnual));
  const salaryPercent = (isMetroCity ? 0.50 : 0.40) * basicSalaryAnnual;

  const exemption = Math.min(actualHraReceived, excessRent, salaryPercent);
  return Math.round(Math.max(0, exemption) * 100) / 100;
}

/**
 * Calculate tax under the Old Tax Regime
 *
 * @param {Object} params
 * @param {number} params.grossAnnual - Total annual gross earnings
 * @param {Object} [params.declarations] - Deductions & exemptions
 * @returns {Object} Full breakdown of old regime tax calculation
 */
function calculateOldRegimeTax({ grossAnnual = 0, declarations = {}, basicSalaryAnnual = 0 }) {
  const gross = Math.max(0, Number(grossAnnual) || 0);
  const standardDeduction = 50000;

  // 1. Section 80C: EPF, PPF, ELSS, LIC, Tuition fees (capped at ₹1,50,000)
  const raw80C = Number(declarations.section80C || declarations.pfAnnual || 0);
  const deduction80C = Math.min(150000, Math.max(0, raw80C));

  // 2. Section 80D: Health Insurance (self/family max ₹25k, senior parents max ₹50k, combined max ₹1,00,000)
  const self80D = Math.min(25000, Math.max(0, Number(declarations.section80DSelf || 0)));
  const parents80D = Math.min(50000, Math.max(0, Number(declarations.section80DParents || 0)));
  const deduction80D = self80D + parents80D;

  // 3. Section 24(b): Home Loan Interest (capped at ₹2,00,000)
  const homeLoanInterest = Math.min(200000, Math.max(0, Number(declarations.homeLoanInterest || 0)));

  // 4. Section 80CCD(1B): Additional NPS deduction (capped at ₹50,000)
  const deductionNPS = Math.min(50000, Math.max(0, Number(declarations.section80CCDNPS || 0)));

  // 5. Section 10(13A): HRA Exemption
  let hraExemption = 0;
  if (declarations.rentPaidAnnual && declarations.actualHraReceived) {
    hraExemption = calculateHRAExemption({
      actualHraReceived: Number(declarations.actualHraReceived),
      rentPaidAnnual: Number(declarations.rentPaidAnnual),
      basicSalaryAnnual: Number(basicSalaryAnnual || (gross * 0.5)),
      isMetroCity: Boolean(declarations.isMetroCity),
    });
  } else if (declarations.hraExemption) {
    hraExemption = Math.max(0, Number(declarations.hraExemption));
  }

  // 6. Other deductions (80E education loan, 80TTA, etc.)
  const otherDeductions = Math.max(0, Number(declarations.otherDeductions || 0));

  const totalDeductions = standardDeduction + deduction80C + deduction80D + homeLoanInterest + deductionNPS + hraExemption + otherDeductions;
  const taxableIncome = Math.max(0, gross - totalDeductions);

  const slabDefs = [
    { min: 0, max: 250000, rate: 0, label: 'Up to ₹2,50,000' },
    { min: 250000, max: 500000, rate: 0.05, label: '₹2,50,001 to ₹5,00,000' },
    { min: 500000, max: 1000000, rate: 0.20, label: '₹5,00,001 to ₹10,00,000' },
    { min: 1000000, max: Infinity, rate: 0.30, label: 'Above ₹10,00,000' },
  ];

  const slabs = [];
  let rawTax = 0;

  for (const def of slabDefs) {
    if (taxableIncome > def.min) {
      const taxableInThisSlab = Math.min(taxableIncome, def.max) - def.min;
      const taxInThisSlab = Math.round(taxableInThisSlab * def.rate * 100) / 100;
      rawTax += taxInThisSlab;
      slabs.push({
        label: def.label,
        ratePercent: def.rate * 100,
        taxableAmount: taxableInThisSlab,
        taxAmount: taxInThisSlab,
      });
    } else {
      slabs.push({
        label: def.label,
        ratePercent: def.rate * 100,
        taxableAmount: 0,
        taxAmount: 0,
      });
    }
  }

  // Section 87A Rebate for Old Regime: Taxable income up to ₹5,00,000 gets full rebate (up to ₹12,500)
  let rebate87A = 0;
  if (taxableIncome <= 500000) {
    rebate87A = Math.min(rawTax, 12500);
  }

  const taxAfterRebate = Math.max(0, rawTax - rebate87A);
  const cess = Math.round(taxAfterRebate * 0.04 * 100) / 100;
  const totalTax = Math.round(taxAfterRebate + cess);
  const monthlyTDS = Math.round((totalTax / 12) * 100) / 100;

  return {
    regime: 'OLD',
    grossAnnual: gross,
    standardDeduction,
    deductionsBreakdown: {
      standardDeduction,
      section80C: deduction80C,
      section80D: deduction80D,
      homeLoanInterest,
      section80CCDNPS: deductionNPS,
      hraExemption,
      otherDeductions,
    },
    totalDeductions,
    taxableIncome,
    slabs,
    rawTax,
    rebate87A,
    taxAfterRebate,
    cess,
    totalTax,
    monthlyTDS,
    effectiveTaxRate: gross > 0 ? Math.round((totalTax / gross) * 10000) / 100 : 0,
  };
}

/**
 * Side-by-side comparison of New vs Old Regime with statutory recommendation
 *
 * @param {Object} params
 * @param {number} params.grossAnnual
 * @param {Object} [params.declarations]
 * @param {string} [params.financialYear='2024-25']
 * @param {number} [params.basicSalaryAnnual]
 * @returns {Object} Comparative analysis
 */
function compareTaxRegimes({ grossAnnual = 0, declarations = {}, financialYear = '2024-25', basicSalaryAnnual = 0 }) {
  const newRegime = calculateNewRegimeTax({ grossAnnual, financialYear });
  const oldRegime = calculateOldRegimeTax({ grossAnnual, declarations, basicSalaryAnnual });

  const taxDifference = Math.round(Math.abs(oldRegime.totalTax - newRegime.totalTax));
  const recommendedRegime = newRegime.totalTax <= oldRegime.totalTax ? 'NEW' : 'OLD';
  const savingsAmount = taxDifference;

  return {
    grossAnnual: Number(grossAnnual) || 0,
    financialYear,
    newRegime,
    oldRegime,
    comparison: {
      recommendedRegime,
      savingsAmount,
      monthlySavings: Math.round((savingsAmount / 12) * 100) / 100,
      summaryMessage: recommendedRegime === 'NEW'
        ? `The New Tax Regime is more beneficial, saving ₹${savingsAmount.toLocaleString('en-IN')} in annual taxes.`
        : `The Old Tax Regime is more beneficial with your deductions, saving ₹${savingsAmount.toLocaleString('en-IN')} in annual taxes.`,
    },
  };
}

module.exports = {
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  calculateHRAExemption,
  compareTaxRegimes,
};
