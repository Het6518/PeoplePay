import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, User, Building, Briefcase, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { payrollApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function PayslipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchPayslip = async () => {
      try {
        const res = await payrollApi.getPayslip(id);
        const raw = res?.data ?? res;
        const data = (raw && typeof raw.status === 'number' && raw.data) ? raw.data : raw;
        setPayslip(data);
      } catch (error) {
        console.error('Failed to fetch payslip', error);
        toast.error('Failed to load payslip');
      } finally {
        setLoading(false);
      }
    };
    fetchPayslip();
  }, [id]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await payrollApi.downloadPDF(id);
      const blob = new Blob([res.data || res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const empCode = payslip?.employee?.employeeCode || 'EMP';
      link.setAttribute('download', `payslip_${empCode}_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Download failed', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner fullPage />
      </div>
    );
  }

  if (!payslip) {
    return <div className="p-8 text-center text-rose-600 font-bold">Payslip not found</div>;
  }

  const employeeName = payslip.employee
    ? `${payslip.employee.firstName || ''} ${payslip.employee.lastName || ''}`.trim()
    : payslip.employeeName || 'Employee';
  const employeeCode = payslip.employee?.employeeCode || payslip.employeeCode || '-';
  const department = payslip.employee?.department?.name || payslip.department || '-';
  const jobPosition = payslip.contract?.position || payslip.employee?.jobPosition || payslip.jobPosition || '-';
  const payrunName = payslip.payrun?.name || payslip.payrunName || 'Payslip';
  const structureName = payslip.salaryStructure?.name || payslip.contract?.salaryStructure?.name || payslip.payrun?.salaryStructure?.name || payslip.structureName || 'Standard Structure';
  const periodStart = payslip.periodStart || payslip.payrun?.periodStart;
  const periodEnd = payslip.periodEnd || payslip.payrun?.periodEnd;
  const lines = payslip.lines || payslip.rules || [];
  const earnings = lines.filter(r => r.category === 'BASIC' || r.category === 'ALLOWANCE');
  const deductions = lines.filter(r => r.category === 'DEDUCTION');
  const grossSalary = payslip.grossSalary ?? payslip.gross ?? 0;
  const totalDeductions = payslip.totalDeductions ?? payslip.deductions ?? 0;
  const netSalary = payslip.netSalary ?? payslip.net ?? 0;

  const getCalculationBreakdown = (rule, currentPayslip, allLines) => {
    const workedDays = currentPayslip?.workedDays ?? 0;
    const totalDays = currentPayslip?.totalWorkingDays ?? 0;
    const contractWage = currentPayslip?.contract?.wage;

    if (rule.code === 'OT' || rule.name?.toLowerCase().includes('overtime')) {
      const hours = currentPayslip?.overtimeHours || rule.quantity || 0;
      const rate = rule.rate || currentPayslip?.overtimeRate || 0;
      return `${hours} hrs @ ${formatINR(rate)}/hr = ${formatINR(rule.amount)}`;
    }

    if (rule.code === 'BASIC' || rule.category === 'BASIC') {
      if (contractWage) {
        if (totalDays > 0) {
          return `Base Wage ${formatINR(contractWage)} × ${workedDays}/${totalDays} days = ${formatINR(rule.amount)}`;
        }
        return `Monthly Wage: ${formatINR(contractWage)}`;
      }
      return totalDays > 0 ? `${workedDays}/${totalDays} days worked` : 'Standard Basic';
    }

    const percentage = rule.salaryRule?.percentage ?? rule.percentage;
    const percentageBase = rule.salaryRule?.percentageBase ?? rule.percentageBase;
    if (percentage && percentageBase) {
      const baseLine = allLines.find(l => l.code === percentageBase);
      const baseAmount = baseLine ? formatINR(baseLine.amount) : percentageBase;
      return `${percentage}% × ${percentageBase} (${baseAmount}) = ${formatINR(rule.amount)}`;
    }

    const formula = rule.salaryRule?.formula ?? rule.formula;
    if (formula) {
      return `Formula: ${formula} = ${formatINR(rule.amount)}`;
    }

    const fixedAmount = rule.salaryRule?.fixedAmount ?? rule.fixedAmount;
    if (fixedAmount !== undefined && fixedAmount !== null && fixedAmount > 0) {
      return `Fixed Amount: ${formatINR(fixedAmount)}`;
    }

    if (rule.category === 'GROSS') {
      return `Sum of earnings = ${formatINR(rule.amount)}`;
    }

    return `Calculated: ${formatINR(rule.amount)}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[28px] border border-stone-200/80 shadow-soft">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-full hover:bg-stone-100 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <StatusBadge status={payslip.status} />
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary rounded-full px-5 py-2 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Main Payslip Card */}
      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-8 space-y-6">
        
        {/* Permanent Audit Warning Banner for Override */}
        {payslip.isOverride && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-900 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-red-950">Duplicate Period Audit Warning</div>
              <div className="text-xs text-red-800 leading-relaxed mt-1">
                {payslip.overrideWarning || (
                  `Duplicate period warning: this employee was already paid for an overlapping range. Included anyway per manual override${
                    payslip.overrideAt ? ` on ${formatDate(payslip.overrideAt)}` : ''
                  }${payslip.overrideBy ? ` by ${payslip.overrideBy}` : ''}.`
                )}
              </div>
            </div>
          </div>
        )}

        {/* Effective Calculation Period Notice */}
        {payslip.effectivePeriodStart && payslip.effectivePeriodEnd && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Adjusted Calculation Period:</span> {formatDate(payslip.effectivePeriodStart)} – {formatDate(payslip.effectivePeriodEnd)} (Individual batch override applied)
            </div>
          </div>
        )}

        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-stone-200/60 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600">Official Payslip Statement</div>
            <h1 className="text-2xl font-black text-stone-900 mt-1">{employeeName}</h1>
            <p className="text-xs font-medium text-stone-500 font-mono">{employeeCode}</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">Period</span>
            <span className="text-sm font-bold text-stone-800">{formatDate(periodStart)} – {formatDate(periodEnd)}</span>
            <div className="text-xs font-medium text-stone-500 mt-0.5">{payrunName}</div>
          </div>
        </div>

        {/* Info Grid */}
        <div className={`grid grid-cols-2 ${(payslip.overtimeHours > 0 || payslip.overtimeAmount > 0) ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-4 p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60`}>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">Department</span>
            <span className="text-xs font-bold text-stone-800 mt-0.5 block">{department}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">Job Position</span>
            <span className="text-xs font-bold text-stone-800 mt-0.5 block">{jobPosition}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">Salary Structure</span>
            <span className="text-xs font-bold text-stone-800 mt-0.5 block">{structureName}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">Worked Days</span>
            <span className="text-xs font-bold text-amber-600 mt-0.5 block">{payslip.workedDays ?? '-'} / {payslip.totalWorkingDays ?? '-'} days</span>
          </div>
          {(payslip.overtimeHours > 0 || payslip.overtimeAmount > 0) && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">Overtime Pay</span>
              <span className="text-xs font-bold text-primary-600 mt-0.5 block">
                {payslip.overtimeHours || 0} hrs ({formatINR(payslip.overtimeAmount || 0)})
              </span>
            </div>
          )}
        </div>

        {/* Detailed Attendance Breakdown Banner */}
        {(() => {
          const summary = payslip.attendanceSummary || {};
          const present = summary.present ?? payslip.workedDays ?? 0;
          const late = summary.late ?? 0;
          const lateGrace = summary.lateGraceApplied ?? 0;
          const latePenalized = summary.latePenalized ?? 0;
          const halfDay = summary.halfDay ?? 0;
          const shortHours = summary.shortHours ?? 0;
          const absent = summary.absent ?? 0;
          const overtime = summary.overtime ?? (payslip.overtimeHours > 0 ? 1 : 0);
          const leave = summary.leaveDays ?? payslip.leaveDays ?? 0;
          const missing = summary.missingCheckout ?? 0;
          const manual = summary.manualCorrection ?? 0;

          return (
            <div className="p-4 rounded-2xl bg-stone-50/90 border border-stone-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Attendance & Schedule Breakdown
                </span>
                {summary.totalLoggedHours > 0 && (
                  <span className="text-xs font-semibold text-stone-500 font-mono">
                    Total Logged Hours: <span className="font-bold text-stone-800">{summary.totalLoggedHours} hrs</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Present Days: {present}
                </span>

                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  late > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-stone-100 text-stone-500 border-stone-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${late > 0 ? 'bg-amber-500' : 'bg-stone-300'}`} />
                  Late Days: {late} {late > 0 && (lateGrace > 0 || latePenalized > 0) ? `(${lateGrace} Grace • ${latePenalized} Penalized)` : ''}
                </span>

                {halfDay > 0 && (
                  <span className="px-3 py-1 rounded-full bg-amber-100/90 text-amber-900 text-xs font-bold border border-amber-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Half Days (0.5x): {halfDay}
                  </span>
                )}

                {shortHours > 0 && (
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Short Hours (&lt;4h): {shortHours}
                  </span>
                )}

                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  absent > 0 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-stone-100 text-stone-500 border-stone-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${absent > 0 ? 'bg-rose-500' : 'bg-stone-300'}`} />
                  Absent Days: {absent}
                </span>

                {leave > 0 && (
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Paid Leaves: {leave} days
                  </span>
                )}

                {overtime > 0 && (
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Overtime: {overtime} days ({payslip.overtimeHours || 0} hrs)
                  </span>
                )}

                {missing > 0 && (
                  <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-xs font-bold border border-orange-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Missing Checkout: {missing}
                  </span>
                )}

                {manual > 0 && (
                  <span className="px-3 py-1 rounded-full bg-stone-200 text-stone-800 text-xs font-bold border border-stone-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-stone-400" />
                    Manual Corrections: {manual}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Breakdown Tables */}
        <div className="space-y-6">
          {/* Earnings */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Earnings & Allowances</h3>
            <div className="overflow-hidden rounded-2xl border border-stone-200/60">
              <table className="min-w-full divide-y divide-stone-200/60">
                <thead className="bg-stone-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Component</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Calculation Formula / Breakdown</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {earnings.map((r, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/40">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-stone-900">{r.name} ({r.code})</td>
                      <td className="px-4 py-3 text-xs font-medium text-stone-500 font-mono">{getCalculationBreakdown(r, payslip, lines)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-stone-900 text-right">{formatINR(r.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-stone-50 font-bold border-t-2 border-stone-200">
                    <td colSpan="2" className="px-4 py-3 text-xs uppercase tracking-wider text-stone-700">Gross Salary</td>
                    <td className="px-4 py-3 text-xs font-black text-stone-900 text-right">{formatINR(grossSalary)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Deductions</h3>
            <div className="overflow-hidden rounded-2xl border border-stone-200/60">
              <table className="min-w-full divide-y divide-stone-200/60">
                <thead className="bg-stone-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Component</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Calculation Formula / Breakdown</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {deductions.map((r, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/40">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-stone-900">{r.name} ({r.code})</td>
                      <td className="px-4 py-3 text-xs font-medium text-stone-500 font-mono">{getCalculationBreakdown(r, payslip, lines)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-rose-600 text-right">{formatINR(r.amount)}</td>
                    </tr>
                  ))}
                  {deductions.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-4 py-6 text-center text-xs font-medium text-stone-400">No deductions applicable.</td>
                    </tr>
                  )}
                  <tr className="bg-stone-50 font-bold border-t-2 border-stone-200">
                    <td colSpan="2" className="px-4 py-3 text-xs uppercase tracking-wider text-stone-700">Total Deductions</td>
                    <td className="px-4 py-3 text-xs font-black text-rose-600 text-right">{formatINR(totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Net Salary Highlight Box */}
        <div className="bg-amber-400 text-stone-950 p-6 rounded-[24px] flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-stone-950/70 block">Net Payable Salary</span>
            <p className="text-xs font-semibold text-stone-900 mt-0.5">Calculated Net = Gross ({formatINR(grossSalary)}) – Deductions ({formatINR(totalDeductions)})</p>
          </div>
          <div className="text-3xl font-black tracking-tight">{formatINR(netSalary)}</div>
        </div>
      </div>
    </div>
  );
}
