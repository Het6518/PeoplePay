/**
 * Bank Transfer Advice Service for PeoplePay360
 * 
 * Generates corporate batch disbursement files (CSV) for NEFT/RTGS salary transfers
 * compatible with major corporate banking portals (HDFC, ICICI, SBI, Axis, Kotak, IndusInd).
 */

const prisma = require('../config/prisma');

// Bank name to standard IFSC prefix mapping for Indian banking systems
const BANK_IFSC_MAP = {
  'HDFC Bank': 'HDFC0000060',
  'HDFC': 'HDFC0000060',
  'ICICI Bank': 'ICIC0000004',
  'ICICI': 'ICIC0000004',
  'State Bank of India': 'SBIN0000691',
  'SBI': 'SBIN0000691',
  'Axis Bank': 'UTIB0000005',
  'Axis': 'UTIB0000005',
  'Kotak Mahindra Bank': 'KKBK0000958',
  'Kotak': 'KKBK0000958',
  'IndusInd Bank': 'INDB0000001',
  'IndusInd': 'INDB0000001',
  'Punjab National Bank': 'PUNB0000100',
  'PNB': 'PUNB0000100',
  'Bank of Baroda': 'BARB0000001',
  'BOB': 'BARB0000001',
  'Yes Bank': 'YESB0000001',
  'IDFC FIRST Bank': 'IDFB0040101',
  'IDFC': 'IDFB0040101',
};

/**
 * Clean & format CSV values with RFC 4180 escaping
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Get IFSC code for a bank name
 */
function getIfscForBank(bankName) {
  if (!bankName) return 'HDFC0000060';
  const match = Object.keys(BANK_IFSC_MAP).find(
    (k) => k.toLowerCase() === bankName.toLowerCase() || bankName.toLowerCase().includes(k.toLowerCase())
  );
  return match ? BANK_IFSC_MAP[match] : 'HDFC0000060';
}

/**
 * Generate Bank Transfer Summary & Audit stats for a payrun
 * 
 * @param {string} payrunId 
 */
async function getBankAdviceSummary(payrunId) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      payslips: {
        where: { netSalary: { gt: 0 } },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              bankAccountName: true,
              bankAccountNumber: true,
              bankName: true,
              panNumber: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!payrun) {
    throw new Error('Payrun not found');
  }

  let totalDisbursementAmount = 0;
  let readyCount = 0;
  let missingBankDetailsCount = 0;
  const bankDistribution = {};
  const missingEmployees = [];

  for (const p of payrun.payslips) {
    const net = p.netSalary || 0;
    totalDisbursementAmount += net;

    const emp = p.employee;
    const hasAccount = emp && emp.bankAccountNumber && emp.bankAccountNumber.trim().length > 0;
    const bankName = (emp && emp.bankName) ? emp.bankName.trim() : 'Unspecified Bank';

    if (hasAccount) {
      readyCount++;
      if (!bankDistribution[bankName]) {
        bankDistribution[bankName] = { count: 0, totalAmount: 0 };
      }
      bankDistribution[bankName].count++;
      bankDistribution[bankName].totalAmount += net;
    } else {
      missingBankDetailsCount++;
      missingEmployees.push({
        id: emp?.id || p.employeeId,
        name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee',
        code: emp?.employeeCode || '-',
        netSalary: net,
      });
    }
  }

  const bankBreakdown = Object.keys(bankDistribution).map((name) => ({
    bankName: name,
    ifsc: getIfscForBank(name),
    employeeCount: bankDistribution[name].count,
    totalAmount: Math.round(bankDistribution[name].totalAmount * 100) / 100,
  })).sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    payrunId: payrun.id,
    payrunName: payrun.name,
    periodStart: payrun.periodStart,
    periodEnd: payrun.periodEnd,
    status: payrun.status,
    totalPayslips: payrun.payslips.length,
    readyCount,
    missingBankDetailsCount,
    missingEmployees,
    totalDisbursementAmount: Math.round(totalDisbursementAmount * 100) / 100,
    bankBreakdown,
  };
}

/**
 * Generate CSV formatted Bank Advice string
 * 
 * @param {string} payrunId 
 * @returns {Promise<{ csv: string, filename: string, totalAmount: number, totalCount: number }>}
 */
async function generateBankAdviceCSV(payrunId) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      payslips: {
        where: { netSalary: { gt: 0 } },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              bankAccountName: true,
              bankAccountNumber: true,
              bankName: true,
              panNumber: true,
              email: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { employee: { employeeCode: 'asc' } },
      },
    },
  });

  if (!payrun) {
    throw new Error('Payrun not found');
  }

  const periodMonth = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(payrun.periodStart));
  const narration = `SALARY ${periodMonth.toUpperCase()}`;

  // Standard Corporate NEFT/RTGS Batch CSV Headers
  const headers = [
    'Sr No',
    'Beneficiary Name',
    'Beneficiary Account Number',
    'IFSC Code',
    'Bank Name',
    'Amount (INR)',
    'Payment Type',
    'Narration / Remarks',
    'Employee Code',
    'Department',
    'Email Address',
    'PAN Number',
  ];

  const rows = [];
  rows.push(headers.join(','));

  let srNo = 1;
  let totalAmount = 0;

  for (const p of payrun.payslips) {
    const emp = p.employee;
    const beneficiaryName = (emp?.bankAccountName && emp.bankAccountName.trim().length > 0)
      ? emp.bankAccountName.trim()
      : `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim();

    const accountNumber = emp?.bankAccountNumber ? emp.bankAccountNumber.trim() : 'MISSING_ACCOUNT';
    const bankName = emp?.bankName ? emp.bankName.trim() : 'HDFC Bank';
    const ifsc = getIfscForBank(bankName);
    const amount = p.netSalary ? p.netSalary.toFixed(2) : '0.00';
    totalAmount += (p.netSalary || 0);

    // RTGS for >= 2,00,000 INR, NEFT for < 2,00,000 INR
    const paymentType = (p.netSalary >= 200000) ? 'RTGS' : 'NEFT';

    const row = [
      srNo++,
      escapeCsv(beneficiaryName),
      escapeCsv(accountNumber),
      escapeCsv(ifsc),
      escapeCsv(bankName),
      amount,
      paymentType,
      escapeCsv(narration),
      escapeCsv(emp?.employeeCode || ''),
      escapeCsv(emp?.department?.name || ''),
      escapeCsv(emp?.email || ''),
      escapeCsv(emp?.panNumber || ''),
    ];

    rows.push(row.join(','));
  }

  const csvContent = rows.join('\r\n');
  const safePayrunName = (payrun.name || 'payrun').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `bank_advice_${safePayrunName}_${dateStr}.csv`;

  return {
    csv: csvContent,
    filename,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalCount: payrun.payslips.length,
  };
}

module.exports = {
  getBankAdviceSummary,
  generateBankAdviceCSV,
  getIfscForBank,
};
