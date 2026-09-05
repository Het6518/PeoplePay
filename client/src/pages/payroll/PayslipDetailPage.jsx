import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, User, Building, Briefcase, Calendar, CheckCircle } from 'lucide-react';
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
  const structureName = payslip.salaryStructure?.name || payslip.structureName || '-';
  const periodStart = payslip.periodStart || payslip.payrun?.periodStart;
  const periodEnd = payslip.periodEnd || payslip.payrun?.periodEnd;
  const lines = payslip.lines || payslip.rules || [];
  const earnings = lines.filter(r => r.category === 'BASIC' || r.category === 'ALLOWANCE' || r.category === 'GROSS');
  const deductions = lines.filter(r => r.category === 'DEDUCTION');
  const grossSalary = payslip.grossSalary ?? payslip.gross ?? 0;
  const totalDeductions = payslip.totalDeductions ?? payslip.deductions ?? 0;
  const netSalary = payslip.netSalary ?? payslip.net ?? 0;

  const getCalculationBreakdown = (rule, currentPayslip, allLines) => {
    const workedDays = currentPayslip?.workedDays ?? 0;
    const totalDays = currentPayslip?.totalWorkingDays ?? 0;
    const contractWage = currentPayslip?.contract?.wage;

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
      if (totalDays > 0 && workedDays > 0 && workedDays !== totalDays) {
        return `Monthly ${formatINR(fixedAmount)} × ${workedDays}/${totalDays} days = ${formatINR(rule.amount)}`;
      }
      return `Fixed: ${formatINR(fixedAmount)}`;
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60">
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
        </div>

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
