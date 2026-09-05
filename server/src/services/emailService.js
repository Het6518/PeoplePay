/**
 * Email Service — sends payslips and leave notifications via Nodemailer (Gmail SMTP)
 */

const nodemailer = require('nodemailer');

function createTransport() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;

  // Use Gmail service if Gmail parameters or default
  if (user && (user.includes('@gmail.com') || process.env.SMTP_HOST?.includes('gmail'))) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Custom SMTP fallback
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user,
      pass,
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
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const from = process.env.EMAIL_FROM || (user ? `"PeoplePay360" <${user}>` : '"PeoplePay360" <noreply@peoplepay360.com>');

  const subject = `Your Payslip for ${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)} | PeoplePay360`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #374151; margin: 0; padding: 0; }
    .header { background: #18181b; padding: 24px 32px; }
    .header h1 { color: #facc15; margin: 0; font-size: 22px; font-weight: 800; }
    .header p { color: #a1a1aa; margin: 4px 0 0; font-size: 13px; }
    .content { padding: 32px; }
    .greeting { font-size: 15px; margin-bottom: 20px; }
    .summary { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .summary h3 { margin: 0 0 12px; color: #18181b; font-size: 14px; font-weight: 700; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #e7e5e4; }
    .net-amount { font-size: 20px; font-weight: 800; color: #166534; margin-top: 14px; padding-top: 12px; border-top: 2px solid #e7e5e4; }
    .footer { background: #f5f5f4; padding: 20px 32px; font-size: 11px; color: #78716c; border-top: 1px solid #e7e5e4; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PEOPLEPAY 360</h1>
    <p>Enterprise HR & Payroll Management</p>
  </div>
  <div class="content">
    <p class="greeting">Dear <strong>${employeeName}</strong>,</p>
    <p>Your payslip for the period <strong>${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)}</strong> has been generated and is attached to this email as a PDF.</p>

    <div class="summary">
      <h3>Payslip Summary</h3>
      <div class="summary-row"><span>Gross Salary</span><span><strong>${formatINR(payslip.grossSalary)}</strong></span></div>
      <div class="summary-row"><span>Total Deductions</span><span><strong style="color:#dc2626">- ${formatINR(payslip.totalDeductions)}</strong></span></div>
      <div class="summary-row"><span>Worked Days</span><span>${payslip.workedDays} / ${payslip.totalWorkingDays}</span></div>
      <div class="net-amount">Net Payable Salary: ${formatINR(payslip.netSalary)}</div>
    </div>

    <p style="font-size: 13px; color: #57534e;">Please find the attached PDF document for your detailed earnings, allowances, and tax deduction statements.</p>
    
    <p style="font-size: 13px;">If you have any questions regarding your payroll, please contact the HR department.</p>

    <p style="margin-top: 30px; font-size: 14px;">Best regards,<br><strong>PeoplePay360 Payroll Team</strong></p>
  </div>
  <div class="footer">
    <p>This is an automated system email sent to your registered employee email address. Please do not reply directly to this message.</p>
    <p>© ${new Date().getFullYear()} PeoplePay360 — Integrated HR & Payroll Suite</p>
  </div>
</body>
</html>`;

  const filename = `payslip_${payslip.employee?.employeeCode || 'EMP'}_${new Date(payrun.periodStart).toISOString().slice(0, 7)}.pdf`;

  await transporter.sendMail({
    from,
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

/**
 * Send email notification to HRs when an employee submits a new leave request.
 */
async function sendLeaveRequestNotificationToHR({ hrEmails, employeeName, employeeCode, leaveType, startDate, endDate, duration, reason }) {
  if (!hrEmails || hrEmails.length === 0) return;
  const transporter = createTransport();
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const from = process.env.EMAIL_FROM || (user ? `"PeoplePay360" <${user}>` : '"PeoplePay360" <noreply@peoplepay360.com>');

  const subject = `[New Leave Request] ${employeeName} (${employeeCode}) – ${leaveType} (${duration} day${duration > 1 ? 's' : ''})`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #374151; margin: 0; padding: 0; }
    .header { background: #18181b; padding: 24px 32px; }
    .header h1 { color: #facc15; margin: 0; font-size: 22px; font-weight: 800; }
    .header p { color: #a1a1aa; margin: 4px 0 0; font-size: 13px; }
    .content { padding: 32px; }
    .greeting { font-size: 15px; margin-bottom: 20px; }
    .summary { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .summary h3 { margin: 0 0 12px; color: #18181b; font-size: 14px; font-weight: 700; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #e7e5e4; }
    .footer { background: #f5f5f4; padding: 20px 32px; font-size: 11px; color: #78716c; border-top: 1px solid #e7e5e4; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PEOPLEPAY 360</h1>
    <p>Leave Application Notification</p>
  </div>
  <div class="content">
    <p class="greeting">Dear <strong>HR Manager / Admin</strong>,</p>
    <p>A new leave application has been submitted by <strong>${employeeName} (${employeeCode})</strong> and requires your review.</p>

    <div class="summary">
      <h3>Leave Application Details</h3>
      <div class="summary-row"><span>Employee Name</span><span><strong>${employeeName} (${employeeCode})</strong></span></div>
      <div class="summary-row"><span>Leave Type</span><span><strong>${leaveType}</strong></span></div>
      <div class="summary-row"><span>Leave Period</span><span><strong>${formatDate(startDate)} to ${formatDate(endDate)}</strong> (${duration} day${duration > 1 ? 's' : ''})</span></div>
      <div class="summary-row"><span>Reason</span><span>${reason || 'Not specified'}</span></div>
      <div class="summary-row"><span>Status</span><span><strong style="color:#d97706">PENDING APPROVAL</strong></span></div>
    </div>

    <p style="font-size: 13px; color: #57534e;">Please log into the PeoplePay360 Dashboard or Leave Management page to review and process this application.</p>

    <p style="margin-top: 30px; font-size: 14px;">Best regards,<br><strong>PeoplePay360 System</strong></p>
  </div>
  <div class="footer">
    <p>This is an automated system notification. Please do not reply directly to this email.</p>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from,
      to: hrEmails.join(','),
      subject,
      html,
    });
  } catch (err) {
    console.error('Failed to send HR leave notification email:', err.message);
  }
}

/**
 * Send email notification to employee when their leave request is approved or rejected.
 */
async function sendLeaveStatusNotificationToEmployee({ to, employeeName, status, leaveType, startDate, endDate, duration, rejectionReason, approvedByName }) {
  if (!to) return;
  const transporter = createTransport();
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const from = process.env.EMAIL_FROM || (user ? `"PeoplePay360" <${user}>` : '"PeoplePay360" <noreply@peoplepay360.com>');

  const isApproved = status === 'APPROVED';
  const statusColor = isApproved ? '#166534' : '#991b1b';
  const statusText = isApproved ? 'APPROVED' : 'REJECTED';

  const subject = `Your Leave Request has been ${statusText} | PeoplePay360`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #374151; margin: 0; padding: 0; }
    .header { background: #18181b; padding: 24px 32px; }
    .header h1 { color: #facc15; margin: 0; font-size: 22px; font-weight: 800; }
    .header p { color: #a1a1aa; margin: 4px 0 0; font-size: 13px; }
    .content { padding: 32px; }
    .greeting { font-size: 15px; margin-bottom: 20px; }
    .summary { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .summary h3 { margin: 0 0 12px; color: #18181b; font-size: 14px; font-weight: 700; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #e7e5e4; }
    .status-banner { font-size: 18px; font-weight: 800; color: ${statusColor}; margin-top: 14px; padding-top: 12px; border-top: 2px solid #e7e5e4; }
    .footer { background: #f5f5f4; padding: 20px 32px; font-size: 11px; color: #78716c; border-top: 1px solid #e7e5e4; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PEOPLEPAY 360</h1>
    <p>Leave Application Status Update</p>
  </div>
  <div class="content">
    <p class="greeting">Dear <strong>${employeeName}</strong>,</p>
    <p>Your leave request for <strong>${leaveType}</strong> has been processed by the HR Management team.</p>

    <div class="summary">
      <h3>Leave Application Status</h3>
      <div class="summary-row"><span>Leave Type</span><span><strong>${leaveType}</strong></span></div>
      <div class="summary-row"><span>Leave Period</span><span>${formatDate(startDate)} to ${formatDate(endDate)} (${duration} day${duration > 1 ? 's' : ''})</span></div>
      ${approvedByName ? `<div class="summary-row"><span>Processed By</span><span>${approvedByName}</span></div>` : ''}
      ${rejectionReason ? `<div class="summary-row"><span>Rejection Reason</span><span style="color:#dc2626; font-weight:bold;">${rejectionReason}</span></div>` : ''}
      <div class="status-banner">Status: ${statusText}</div>
    </div>

    <p style="font-size: 13px; color: #57534e;">If you have any questions regarding this decision, please contact your HR Manager.</p>

    <p style="margin-top: 30px; font-size: 14px;">Best regards,<br><strong>PeoplePay360 HR Team</strong></p>
  </div>
  <div class="footer">
    <p>This is an automated system notification. Please do not reply directly to this email.</p>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Failed to send employee leave status email:', err.message);
  }
}

module.exports = {
  sendPayslipEmail,
  sendLeaveRequestNotificationToHR,
  sendLeaveStatusNotificationToEmployee,
};
