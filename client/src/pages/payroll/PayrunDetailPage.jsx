import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, Play, CheckCircle, CreditCard, AlertTriangle, 
  Info, Loader2, Users, DollarSign, ArrowLeft 
} from 'lucide-react';
import { payrollApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const styles = {
    DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    COMPUTED: 'bg-blue-100 text-blue-800 border-blue-200',
    VALIDATED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    PAID: 'bg-green-100 text-green-800 border-green-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
      {status}
    </span>
  );
};

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
    <div className="flex items-center gap-2 text-xs font-semibold">
      {steps.map((step, idx) => {
        const isDone = currentIndex >= idx;
        const isCurrent = currentStatus === step.key;
        return (
          <React.Fragment key={step.key}>
            <span
              className={`px-3 py-1.5 rounded-full transition-all ${
                isCurrent
                  ? 'bg-slate-950 text-white shadow-sm ring-2 ring-slate-950'
                  : isDone
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <span className={`h-0.5 w-4 ${currentIndex > idx ? 'bg-emerald-500' : 'bg-slate-200'}`} />
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!payrun) {
    return <div className="p-8 text-center text-red-500">Payrun not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/payroll/payruns')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {payrun.name}
                <StatusBadge status={payrun.status} />
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Period: <span className="font-medium text-slate-700">{formatDate(payrun.periodStart)} - {formatDate(payrun.periodEnd)}</span>
                <span className="mx-2">•</span>
                Structure: <span className="font-medium text-slate-700">{payrun.structureName}</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {payrun.status === 'DRAFT' && (
              <button 
                onClick={() => handleAction(payrollApi.compute, 'Payrun computed successfully')}
                disabled={actionLoading}
                className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm disabled:opacity-50 transition-all"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                1. COMPUTE PAYRUN
              </button>
            )}
            {payrun.status === 'COMPUTED' && (
              <>
                <button 
                  onClick={() => handleAction(payrollApi.compute, 'Payrun recomputed')}
                  disabled={actionLoading}
                  className="flex items-center px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl disabled:opacity-50 transition-all"
                >
                  <Play className="w-4 h-4 mr-2" /> RE-COMPUTE
                </button>
                <button 
                  onClick={() => handleAction(payrollApi.validate, 'Payrun validated and confirmed!')}
                  disabled={actionLoading}
                  className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm disabled:opacity-50 transition-all"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  2. CONFIRM & VALIDATE
                </button>
              </>
            )}
            {payrun.status === 'VALIDATED' && canFinalize && (
              <>
                <button 
                  onClick={() => handleAction(payrollApi.markPaid, 'Payrun marked as Paid & Finalized!')}
                  disabled={actionLoading}
                  className="flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm disabled:opacity-50 transition-all"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  3. MARK PAID / FINALIZE
                </button>
                <button 
                  onClick={() => handleAction(payrollApi.sendPayslips, 'Payslips sent to employees')}
                  disabled={actionLoading}
                  className="flex items-center px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 mr-2" /> SEND PAYSLIPS
                </button>
              </>
            )}
            {payrun.status === 'PAID' && (
              <button 
                onClick={() => handleAction(payrollApi.sendPayslips, 'Payslips sent to employees')}
                disabled={actionLoading}
                className="flex items-center px-5 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl shadow-sm disabled:opacity-50"
              >
                <FileText className="w-4 h-4 mr-2" /> SEND PAYSLIPS
              </button>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <StatusStepper currentStatus={payrun.status} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Employees" value={payrun.employeeCount} icon={<Users className="text-blue-500" />} />
        <SummaryCard title="Total Gross" value={formatINR(payrun.totalGross)} icon={<DollarSign className="text-emerald-500" />} />
        <SummaryCard title="Total Deductions" value={formatINR(payrun.totalDeductions)} icon={<DollarSign className="text-red-500" />} />
        <SummaryCard title="Total Net" value={formatINR(payrun.totalNet)} icon={<DollarSign className="text-indigo-500" />} className="bg-indigo-50" />
      </div>

      {/* Validation Panel */}
      {(payrun.status === 'VALIDATED' || payrun.validationErrors?.length > 0) && payrun.validationErrors && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-amber-800 font-semibold mb-2 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" /> Validation Messages
          </h3>
          <ul className="space-y-2 pl-7">
            {payrun.validationErrors.map((msg, i) => (
              <li key={i} className="text-sm text-amber-900 flex items-start">
                <span className="mr-2 mt-1">•</span> {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Payslips Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Employee Payslips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrun.payslips?.map(slip => (
                <tr key={slip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-0">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          {slip.employeeName}
                          {slip.hasWarnings && <AlertTriangle className="w-4 h-4 text-amber-500 ml-2" title="Warnings present" />}
                        </div>
                        <div className="text-sm text-gray-500">{slip.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{slip.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatINR(slip.gross)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">{formatINR(slip.deductions)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatINR(slip.net)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${slip.status === 'COMPUTED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {slip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/payroll/payslips/${slip.id}`} className="text-primary-600 hover:text-primary-900 flex justify-end items-center">
                      View Payslip
                    </Link>
                  </td>
                </tr>
              ))}
              {(!payrun.payslips || payrun.payslips.length === 0) && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No payslips generated yet. Click COMPUTE to generate.
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

function SummaryCard({ title, value, icon, className = "bg-white" }) {
  return (
    <div className={`p-5 rounded-lg shadow-sm border border-gray-200 flex items-center ${className}`}>
      <div className="p-3 rounded-full bg-gray-50 mr-4 border border-gray-100">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
