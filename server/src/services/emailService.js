/**
 * Email Service — sends payslips via Nodemailer (Gmail SMTP)
 */

const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Send a payslip email with PDF attachment.
 */
async function sendPayslipEmail({ to, employeeName, payslip, payrun, pdfBuffer }) {
  const transporter = createTransport();

  const subject = `Your Payslip for ${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)} | PeoplePay360`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #374151; margin: 0; padding: 0; }
    .header { background: #4f46e5; padding: 24px 32px; }
    .header h1 { color: white; margin: 0; font-size: 22px; }
    .header p { color: #c7d2fe; margin: 4px 0 0; font-size: 13px; }
    .content { padding: 32px; }
    .greeting { font-size: 15px; margin-bottom: 20px; }
    .summary { background: #f5f3ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .summary h3 { margin: 0 0 12px; color: #4f46e5; font-size: 14px; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .net-amount { font-size: 20px; font-weight: bold; color: #1e1b4b; margin-top: 12px; padding-top: 12px; border-top: 1px solid #c7d2fe; }
    .footer { background: #f9fafb; padding: 20px 32px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .cta { background: #4f46e5; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PeoplePay360</h1>
    <p>Integrated HR & Payroll Platform</p>
  </div>
  <div class="content">
    <p class="greeting">Dear <strong>${employeeName}</strong>,</p>
    <p>Please find your payslip for the period <strong>${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)}</strong> attached to this email.</p>

    <div class="summary">
      <h3>Payslip Summary</h3>
      <div class="summary-row"><span>Gross Salary</span><span><strong>${formatINR(payslip.grossSalary)}</strong></span></div>
      <div class="summary-row"><span>Total Deductions</span><span><strong style="color:#ef4444">- ${formatINR(payslip.totalDeductions)}</strong></span></div>
      <div class="summary-row"><span>Worked Days</span><span>${payslip.workedDays} / ${payslip.totalWorkingDays}</span></div>
      <div class="net-amount">Net Salary: ${formatINR(payslip.netSalary)}</div>
    </div>

    <p style="font-size: 13px; color: #6b7280;">Please review the attached PDF for the full earnings and deductions breakdown.</p>
    
    <p style="font-size: 13px;">If you have any questions, please contact your HR department.</p>

    <p style="margin-top: 30px; font-size: 14px;">Best regards,<br><strong>PeoplePay360 Payroll Team</strong></p>
  </div>
  <div class="footer">
    <p>This is an automated email. Please do not reply directly to this message.</p>
    <p>© ${new Date().getFullYear()} PeoplePay360 — Integrated HR & Payroll Platform</p>
  </div>
</body>
</html>`;

  const filename = `payslip_${payslip.employee?.employeeCode || 'EMP'}_${new Date(payrun.periodStart).toISOString().slice(0, 7)}.pdf`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"PeoplePay360" <noreply@peoplepay360.com>',
    to,
    subject,
    html,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

module.exports = { sendPayslipEmail };
