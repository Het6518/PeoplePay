import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, User, Building, Briefcase, Calendar, CheckCircle } from 'lucide-react';
import { payrollApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';

import { StatusBadge } from '../../components/ui/Badge';
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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!payslip) {
    return <div className="p-8 text-center text-red-500">Payslip not found</div>;
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

    // 1. Basic Salary
    if (rule.code === 'BASIC' || rule.category === 'BASIC') {
      if (contractWage) {
        if (totalDays > 0) {
          return `Base Wage ${formatINR(contractWage)} × ${workedDays}/${totalDays} days = ${formatINR(rule.amount)}`;
        }
        return `Monthly Wage: ${formatINR(contractWage)}`;
      }
      return totalDays > 0 ? `${workedDays}/${totalDays} days worked` : 'Standard Basic';
    }

    // 2. Percentage based rules (e.g. HRA, PF, Special Allowance)
    const percentage = rule.salaryRule?.percentage ?? rule.percentage;
    const percentageBase = rule.salaryRule?.percentageBase ?? rule.percentageBase;
    if (percentage && percentageBase) {
      const baseLine = allLines.find(l => l.code === percentageBase);
      const baseAmount = baseLine ? formatINR(baseLine.amount) : percentageBase;
      return `${percentage}% × ${percentageBase} (${baseAmount}) = ${formatINR(rule.amount)}`;
    }

    // 3. Formula based rules
    const formula = rule.salaryRule?.formula ?? rule.formula;
    if (formula) {
      return `Formula: ${formula} = ${formatINR(rule.amount)}`;
    }

    // 4. Fixed rules with proration (e.g. Transport, PT, Medical)
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>
        <div className="flex items-center space-x-4">
          <StatusBadge status={payslip.status} />
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {downloading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Download className="w-4 h-4 mr-2" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Payslip Content */}
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200" id="payslip-document">
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wider">PAYSLIP</h1>
          <p className="text-gray-500 mt-1 font-medium">{payrunName}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Employee Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Employee Details</h3>
            <div className="flex items-center text-gray-800">
              <User className="w-4 h-4 mr-3 text-gray-400" />
              <span className="font-medium text-lg">{employeeName}</span>
              <span className="ml-2 text-sm text-gray-500">({employeeCode})</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Building className="w-4 h-4 mr-3 text-gray-400" />
              {department}
            </div>
            <div className="flex items-center text-gray-600">
              <Briefcase className="w-4 h-4 mr-3 text-gray-400" />
              {jobPosition}
            </div>
          </div>

          {/* Payroll Info */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Payroll Details</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 flex items-center"><Calendar className="w-4 h-4 mr-2 text-gray-400"/> Period:</span>
              <span className="font-medium text-gray-800">{formatDate(periodStart)} to {formatDate(periodEnd)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 flex items-center"><FileText className="w-4 h-4 mr-2 text-gray-400"/> Structure:</span>
              <span className="font-medium text-gray-800">{structureName}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-gray-400"/> Worked Days:</span>
              <span className="font-medium text-gray-800">{payslip.workedDays ?? 0} / {payslip.totalWorkingDays ?? 0} Days</span>
            </div>
          </div>
        </div>

        {/* Salary Details Table */}
        <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-600">Description</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-600">Code</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-600">Calculation / Formula</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-600 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Earnings Section */}
              <tr className="bg-slate-50/75">
                <td colSpan="4" className="py-2.5 px-4 text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  ✦ Earnings & Allowances
                </td>
              </tr>
              {earnings.map((rule, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 text-sm font-semibold text-slate-900">{rule.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono font-medium">
                      {rule.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-500 font-mono">
                    <span className="bg-indigo-50/60 text-indigo-700 px-2 py-1 rounded border border-indigo-100/80">
                      {getCalculationBreakdown(rule, payslip, lines)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold text-slate-900 text-right">{formatINR(rule.amount)}</td>
                </tr>
              ))}
              <tr className="bg-emerald-50/40 border-t-2 border-slate-200">
                <td colSpan="3" className="py-3.5 px-4 text-sm font-bold text-slate-900">Gross Salary</td>
                <td className="py-3.5 px-4 text-base font-extrabold text-slate-900 text-right">{formatINR(grossSalary)}</td>
              </tr>

              {/* Deductions Section */}
              <tr className="bg-slate-50/75 border-t-2 border-slate-200">
                <td colSpan="4" className="py-2.5 px-4 text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  ✦ Deductions & Taxes
                </td>
              </tr>
              {deductions.map((rule, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 text-sm font-semibold text-slate-900">{rule.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono font-medium">
                      {rule.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-500 font-mono">
                    <span className="bg-red-50/60 text-red-700 px-2 py-1 rounded border border-red-100/80">
                      {getCalculationBreakdown(rule, payslip, lines)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold text-red-600 text-right">−{formatINR(rule.amount)}</td>
                </tr>
              ))}
              <tr className="bg-red-50/40 border-t-2 border-slate-200">
                <td colSpan="3" className="py-3.5 px-4 text-sm font-bold text-slate-900">Total Deductions</td>
                <td className="py-3.5 px-4 text-base font-extrabold text-red-600 text-right">−{formatINR(totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net Salary Highlights & Summary Equation */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-br from-slate-950 to-indigo-950 text-white rounded-2xl shadow-lg">
          <div className="space-y-1">
            <p className="text-xs font-bold tracking-wider text-indigo-300 uppercase">Net Salary Formula</p>
            <p className="text-sm text-slate-200 font-mono">
              Gross Earnings ({formatINR(grossSalary)}) − Total Deductions ({formatINR(totalDeductions)})
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Take Home Pay</p>
            <p className="text-3xl font-extrabold text-emerald-400">{formatINR(netSalary)}</p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
          <p>This is a computer-generated document and does not require a signature.</p>
        </div>
      </div>
    </div>
  );
}
