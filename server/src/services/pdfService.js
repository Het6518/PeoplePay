/**
 * PDF Service — generates professional payslip PDFs using PDFKit
 */

const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#4f46e5',    // Indigo
  dark: '#1e1b4b',
  text: '#374151',
  muted: '#6b7280',
  light: '#f9fafb',
  border: '#e5e7eb',
  green: '#10b981',
  red: '#ef4444',
  white: '#ffffff',
};

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Generate a payslip PDF as a Buffer.
 * @param {Object} payslip - Payslip with lines, employee, contract, salaryStructure
 * @param {Object} payrun - Parent payrun
 * @returns {Promise<Buffer>}
 */
function generatePayslipPDF(payslip, payrun) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80; // margins
      const left = 40;

      // ── HEADER ──────────────────────────────────────────────────────────────
      // Company banner
      doc.rect(left - 10, 30, pageWidth + 20, 70).fill(COLORS.primary);

      doc.fillColor(COLORS.white)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('PeoplePay360', left, 48, { width: pageWidth / 2 });

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#c7d2fe')
        .text('Integrated HR & Payroll Platform', left, 72);

      doc.fillColor(COLORS.white)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('PAYSLIP', left + pageWidth / 2, 48, { width: pageWidth / 2, align: 'right' });

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#c7d2fe')
        .text(
          `Period: ${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)}`,
          left + pageWidth / 2,
          68,
          { width: pageWidth / 2, align: 'right' }
        );

      let y = 115;

      // ── EMPLOYEE & PAYRUN INFO ───────────────────────────────────────────────
      const infoBoxH = 90;
      doc.rect(left - 10, y, pageWidth + 20, infoBoxH).fill(COLORS.light);
      doc.rect(left - 10, y, pageWidth + 20, infoBoxH).stroke(COLORS.border);

      const col1 = left;
      const col2 = left + pageWidth / 2 + 10;

      doc.fillColor(COLORS.primary).fontSize(8).font('Helvetica-Bold')
        .text('EMPLOYEE INFORMATION', col1, y + 10);

      doc.fillColor(COLORS.primary).fontSize(8).font('Helvetica-Bold')
        .text('PAYROLL INFORMATION', col2, y + 10);

      const empName = `${payslip.employee.firstName} ${payslip.employee.lastName}`;

      doc.fillColor(COLORS.text).fontSize(9).font('Helvetica-Bold')
        .text(empName, col1, y + 22);

      doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
        .text(`Code: ${payslip.employee.employeeCode}`, col1, y + 36)
        .text(`Department: ${payslip.employee.department?.name || '-'}`, col1, y + 48)
        .text(`Position: ${payslip.contract?.position || '-'}`, col1, y + 60);

      doc.fillColor(COLORS.text).fontSize(8).font('Helvetica')
        .text(`Payrun: ${payrun.name}`, col2, y + 22)
        .text(`Period: ${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)}`, col2, y + 34)
        .text(`Worked Days: ${payslip.workedDays} / ${payslip.totalWorkingDays}`, col2, y + 46)
        .text(`Leave Days: ${payslip.leaveDays || 0}`, col2, y + 58)
        .text(`Status: ${payslip.status}`, col2, y + 70);

      y += infoBoxH + 15;

      // ── EARNINGS ────────────────────────────────────────────────────────────
      const earnings = payslip.lines.filter((l) => ['BASIC', 'ALLOWANCE'].includes(l.category));
      const deductions = payslip.lines.filter((l) => l.category === 'DEDUCTION');
      const grossLine = payslip.lines.find((l) => l.category === 'GROSS');
      const netLine = payslip.lines.find((l) => l.category === 'NET');

      function drawSectionHeader(title, yPos) {
        doc.rect(left - 10, yPos, pageWidth + 20, 22).fill(COLORS.primary);
        doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold')
          .text(title, left, yPos + 6);
        return yPos + 22;
      }

      function drawTableRow(label, amount, yPos, isTotal = false, isNegative = false) {
        if (isTotal) {
          doc.rect(left - 10, yPos, pageWidth + 20, 22).fill('#ede9fe');
        } else if (yPos % 40 < 20) {
          doc.rect(left - 10, yPos, pageWidth + 20, 20).fill('#f5f3ff');
        }

        doc.fillColor(isTotal ? COLORS.dark : COLORS.text)
          .fontSize(isTotal ? 9 : 8.5)
          .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
          .text(label, left, yPos + (isTotal ? 6 : 5), { width: pageWidth * 0.6 });

        doc.fillColor(isNegative ? COLORS.red : isTotal ? COLORS.dark : COLORS.text)
          .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
          .text(formatINR(amount), left + pageWidth * 0.6, yPos + (isTotal ? 6 : 5), {
            width: pageWidth * 0.4,
            align: 'right',
          });

        return yPos + (isTotal ? 22 : 20);
      }

      // Earnings section
      y = drawSectionHeader('EARNINGS', y);
      for (const line of earnings) {
        y = drawTableRow(line.name, line.amount, y);
      }
      if (grossLine) {
        y = drawTableRow('GROSS SALARY', grossLine.amount || payslip.grossSalary, y, true);
      } else {
        y = drawTableRow('GROSS SALARY', payslip.grossSalary, y, true);
      }

      y += 10;

      // Deductions section
      if (deductions.length > 0) {
        y = drawSectionHeader('DEDUCTIONS', y);
        for (const line of deductions) {
          y = drawTableRow(line.name, line.amount, y, false, true);
        }
        y = drawTableRow('TOTAL DEDUCTIONS', payslip.totalDeductions, y, true, true);
        y += 10;
      }

      // ── NET SALARY ──────────────────────────────────────────────────────────
      const netBoxY = y;
      doc.rect(left - 10, netBoxY, pageWidth + 20, 50).fill(COLORS.dark);

      doc.fillColor(COLORS.white).fontSize(11).font('Helvetica-Bold')
        .text('NET SALARY', left, netBoxY + 10);

      doc.fillColor('#a5f3fc').fontSize(18).font('Helvetica-Bold')
        .text(formatINR(netLine?.amount || payslip.netSalary), left, netBoxY + 10, {
          width: pageWidth,
          align: 'right',
        });

      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
        .text('Amount in words (INR)', left, netBoxY + 36);

      y = netBoxY + 60;

      // ── FOOTER ──────────────────────────────────────────────────────────────
      y += 20;
      doc.rect(left - 10, y, pageWidth + 20, 1).fill(COLORS.border);
      y += 10;

      doc.fillColor(COLORS.muted).fontSize(7).font('Helvetica')
        .text(`Generated on ${new Date().toLocaleString('en-IN')}  •  This is a computer-generated payslip.  •  PeoplePay360`, left, y, {
          width: pageWidth,
          align: 'center',
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePayslipPDF };
