import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, Play, CheckCircle, CreditCard, AlertTriangle, 
  Info, Loader2, Users, DollarSign, ArrowLeft, Send
} from 'lucide-react';
import { payrollApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const StatusStepper = ({ currentStatus }) => {
  const steps = [
    { key: 'DRAFT', label: '1. Draft' },
    { key: 'COMPUTED', label: '2. Computed' },
    { key: 'VALIDATED', label: '3. Validated' },
    { key: 'PAID', label: '4. Paid / Final' },
  ];
  const order = ['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID'];
  const currentIndex = order.indexOf(currentStatus);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
      {steps.map((step, idx) => {
        const isDone = currentIndex >= idx;
        const isCurrent = currentStatus === step.key;
        return (
          <React.Fragment key={step.key}>
            <span
              className={`px-3 py-1.5 rounded-full transition-all ${
                isCurrent
                  ? 'bg-stone-900 text-white shadow-sm ring-2 ring-amber-400'
                  : isDone
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-stone-100 text-stone-400'
              }`}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <span className={`h-0.5 w-3 ${currentIndex > idx ? 'bg-amber-400' : 'bg-stone-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function PayrunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canFinalize = ['HR_PAYROLL_MANAGER', 'ADMIN', 'HR_PAYROLL_USER'].includes(currentUser?.role);

  const [payrun, setPayrun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPayrun = async () => {
    try {
      const res = await payrollApi.getPayrun(id);
      const data = res?.data || res;
      if (!data || !data.id) {
        setPayrun(null);
        return;
      }
      const normalized = {
        ...data,
        structureName: data.structureName || data.salaryStructure?.name || 'Standard Structure',
        employeeCount: data.employeeCount ?? data._count?.payslips ?? data.payslips?.length ?? 0,
        totalGross: data.totalGross ?? 0,
        totalDeductions: data.totalDeductions ?? 0,
        totalNet: data.totalNet ?? 0,
        payslips: (data.payslips || []).map(p => ({
          ...p,
          employeeName: p.employeeName || (p.employee ? `${p.employee.firstName || ''} ${p.employee.lastName || ''}`.trim() : 'Employee'),
          employeeCode: p.employeeCode || p.employee?.employeeCode || '',
          department: typeof p.department === 'string' ? p.department : (p.employee?.department?.name || '-'),
          gross: p.gross ?? p.grossSalary ?? 0,
          deductions: p.deductions ?? p.totalDeductions ?? 0,
          net: p.net ?? p.netSalary ?? 0,
        })),
      };
      setPayrun(normalized);
    } catch (error) {
      toast.error('Failed to load payrun details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrun();
  }, [id]);

  const handleAction = async (actionFn, successMessage) => {
    setActionLoading(true);
    try {
      await actionFn(id);
      toast.success(successMessage);
      await fetchPayrun();
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Action failed';
      toast.error(msg);
      console.error('Payrun action failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner fullPage />
      </div>
    );
  }

  if (!payrun) {
    return <div className="p-8 text-center text-rose-600 font-bold">Payrun not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-[28px] border border-stone-200/80 shadow-soft space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/payroll/payruns')} className="p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900 flex items-center gap-3">
                {payrun.name}
                <StatusBadge status={payrun.status} />
              </h1>
              <p className="text-xs font-medium text-stone-500 mt-1">
                Period: <span className="font-semibold text-stone-800">{formatDate(payrun.periodStart)} – {formatDate(payrun.periodEnd)}</span> | Structure: <span className="font-semibold text-stone-800">{payrun.structureName}</span>
              </p>
            </div>
          </div>

          <StatusStepper currentStatus={payrun.status} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-100">
          {payrun.status === 'DRAFT' && (
            <button
              onClick={() => handleAction(payrollApi.computePayrun, 'Payrun computed successfully!')}
              disabled={actionLoading}
              className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Compute Payrun
            </button>
          )}

          {payrun.status === 'COMPUTED' && (
            <button
              onClick={() => handleAction(payrollApi.validatePayrun, 'Payrun validated!')}
              disabled={actionLoading}
              className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 shadow-sm flex items-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
              Validate Payrun
            </button>
          )}

          {payrun.status === 'VALIDATED' && canFinalize && (
            <button
              onClick={() => handleAction(payrollApi.markPaid, 'Payrun marked as Paid & Finalized!')}
              disabled={actionLoading}
              className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm flex items-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Mark Paid / Finalize
            </button>
          )}

          <button
            onClick={() => handleAction(payrollApi.sendPayslips, 'Payslips sent to employees!')}
            disabled={actionLoading}
            className="rounded-full px-4 py-2 text-xs font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-all flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" /> Send Payslips
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900 text-white p-5 rounded-[24px] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Employees</span>
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black mt-2 text-amber-400">{payrun.employeeCount}</div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-stone-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Gross Payroll</span>
            <DollarSign className="w-5 h-5 text-stone-400" />
          </div>
          <div className="text-2xl font-black mt-2 text-stone-900">{formatINR(payrun.totalGross)}</div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-stone-200/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Deductions</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-rose-600">{formatINR(payrun.totalDeductions)}</div>
        </div>

        <div className="bg-amber-500 text-stone-950 p-5 rounded-[24px] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900/80">Net Amount Paid</span>
            <CreditCard className="w-5 h-5 text-stone-950" />
          </div>
          <div className="text-2xl font-black mt-2">{formatINR(payrun.totalNet)}</div>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Generated Payslips ({payrun.payslips?.length || 0})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200/60">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Department</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Gross</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Deductions</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Net Salary</th>
                <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-stone-500">Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {payrun.payslips?.map((p) => {
                const empName = p.employeeName || `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.trim() || 'Employee';
                const empCode = p.employeeCode || p.employee?.employeeCode || '';
                const deptName = p.department || p.employee?.department?.name || '-';
                const grossVal = p.gross ?? p.grossSalary ?? 0;
                const dedVal = p.deductions ?? p.totalDeductions ?? 0;
                const netVal = p.net ?? p.netSalary ?? 0;
                const issues = p.validationNotes?.issues || [];
                const primaryIssue = issues.length > 0 ? issues[0].message : (p.status === 'DRAFT' ? 'No active contract for this period' : null);

                return (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-stone-900">{empName}</div>
                      <div className="text-xs text-stone-400 font-mono">{empCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">{deptName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-700 text-right">{formatINR(grossVal)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-rose-600 text-right">{formatINR(dedVal)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">{formatINR(netVal)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={p.status || payrun.status} />
                        {primaryIssue && (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full max-w-[200px] truncate" title={primaryIssue}>
                            ⚠️ {primaryIssue}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <Link
                        to={`/payroll/payslips/${p.id}`}
                        className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-700 transition-all inline-block font-bold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(!payrun.payslips || payrun.payslips.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-medium text-stone-400">
                    No payslips available in this payrun yet. Click "Compute Payrun" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
