import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Edit, FileText, Calendar, Clock, DollarSign, Download, Eye, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeApi, payrollApi } from '../../services/apiServices';
import { getInitials, formatDate, formatINR } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [payslipPage, setPayslipPage] = useState(1);

  const { currentUser, isHR, isPayroll } = useAuth();
  const canEdit = isHR();
  const canViewContracts = isHR();
  const isOwnEmployeeProfile = currentUser?.role === 'EMPLOYEE'
    && (currentUser?.employeeId || currentUser?.employee?.id) === id;
  const canViewPayroll = isPayroll() || isHR() || isOwnEmployeeProfile;

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  useEffect(() => {
    if (id && canViewPayroll) {
      fetchPayslips();
    }
  }, [id, canViewPayroll]);

  const fetchEmployee = async () => {
    try {
      const response = await employeeApi.getById(id);
      setEmployee(response.data);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      toast.error('Failed to fetch employee details');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslips = async () => {
    setPayslipsLoading(true);
    try {
      const res = await payrollApi.getPayslips({ employeeId: id, limit: 50 });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setPayslips(list);
    } catch (err) {
      console.error('Failed to fetch employee payslips:', err);
    } finally {
      setPayslipsLoading(false);
    }
  };

  const handleDownloadPDF = async (payslipId) => {
    try {
      const res = await payrollApi.downloadPDF(payslipId);
      const url = window.URL.createObjectURL(new Blob([res.data || res], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${payslipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('Failed to download PDF', err);
      toast.error('Failed to download PDF');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!employee) return <div className="p-8 text-center text-stone-500 font-semibold">Employee not found</div>;

  const counts = employee._count || { contracts: 0, attendance: 0, timeOffRequests: 0, payslips: 0 };
  const payslipCount = payslips.length > 0 ? payslips.length : counts.payslips;

  const activeContract = employee.contracts?.find(c => c.status === 'ACTIVE') || employee.contracts?.[0];
  const salaryStructure = activeContract?.salaryStructure;

  return (
    <div className="space-y-7 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-end">
        {canEdit && (
          <Link
            to={`/employees/${id}/edit`}
            className="btn-secondary inline-flex items-center"
          >
            <Edit className="h-4 w-4 mr-2 text-stone-600" /> Edit Profile
          </Link>
        )}
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-7 flex flex-col md:flex-row items-center md:items-start gap-6">
        <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-stone-900 text-amber-400 font-extrabold text-2xl shadow-md flex-shrink-0">
          {getInitials(employee.firstName, employee.lastName)}
        </span>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">{employee.firstName} {employee.lastName}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
            <span className="text-xs font-bold text-stone-400 bg-stone-100 px-3 py-1 rounded-full">{employee.employeeCode}</span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-semibold text-stone-700">{employee.jobPosition || 'No Position'}</span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-semibold text-stone-700">{employee.department?.name || 'No Department'}</span>
            <span className="text-stone-300">•</span>
            <StatusBadge status={employee.status} />
          </div>
        </div>
      </div>

      {/* Smart Hub Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {canViewContracts && (
          <Link to={`/contracts?employeeId=${id}`} className="bg-white p-5 rounded-[24px] border border-stone-200/70 shadow-sm hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center justify-center group">
            <div className="p-3 rounded-full bg-amber-50 text-amber-600 mb-2 group-hover:scale-110 transition-transform">
              <FileText className="h-6 w-6" />
            </div>
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight">{counts.contracts}</span>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-0.5">Contracts</span>
          </Link>
        )}
        
        <Link to={`/attendance?employeeId=${id}`} className="bg-white p-5 rounded-[24px] border border-stone-200/70 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all flex flex-col items-center justify-center group">
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 mb-2 group-hover:scale-110 transition-transform">
            <Clock className="h-6 w-6" />
          </div>
          <span className="text-2xl font-extrabold text-stone-900 tracking-tight">{counts.attendance}</span>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-0.5">Attendance</span>
        </Link>

        <Link to={`/time-off/requests?employeeId=${id}`} className="bg-white p-5 rounded-[24px] border border-stone-200/70 shadow-sm hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center justify-center group">
          <div className="p-3 rounded-full bg-amber-50 text-amber-700 mb-2 group-hover:scale-110 transition-transform">
            <Calendar className="h-6 w-6" />
          </div>
          <span className="text-2xl font-extrabold text-stone-900 tracking-tight">{counts.timeOffRequests}</span>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-0.5">Leave</span>
        </Link>

        {canViewPayroll && (
          <Link to={`/payroll/payslips?employeeId=${id}`} className="bg-white p-5 rounded-[24px] border border-stone-200/70 shadow-sm hover:border-purple-400 hover:shadow-md transition-all flex flex-col items-center justify-center group">
            <div className="p-3 rounded-full bg-purple-50 text-purple-700 mb-2 group-hover:scale-110 transition-transform">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight">{payslipCount}</span>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-0.5">Payslips</span>
          </Link>
        )}
      </div>

      {/* Info Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70">
            <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider">Personal Information</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Email Address</dt>
                <dd className="mt-1 text-xs font-semibold text-stone-900">{employee.email}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Phone Number</dt>
                <dd className="mt-1 text-xs font-semibold text-stone-900">{employee.phone || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Date of Birth</dt>
                <dd className="mt-1 text-xs font-semibold text-stone-900">{employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">PAN Number</dt>
                <dd className="mt-1 text-xs font-extrabold text-stone-900 font-mono uppercase">{employee.panNumber || '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Employment Info */}
        <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70">
            <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider">Employment Details</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Employee Type</dt>
                <dd className="mt-1 text-xs font-semibold text-stone-900 capitalize">{employee.employeeType?.replace('_', ' ')}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Joining Date</dt>
                <dd className="mt-1 text-xs font-semibold text-stone-900">{employee.joiningDate ? formatDate(employee.joiningDate) : '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Manager</dt>
                <dd className="mt-1 text-xs font-semibold text-stone-900">
                  {employee.manager ? (
                    <Link to={`/employees/${employee.manager.id}`} className="text-amber-700 font-bold hover:underline">
                      {employee.manager.firstName} {employee.manager.lastName}
                    </Link>
                  ) : '-'}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Working Schedule</dt>
                <dd className="mt-1 text-xs font-semibold text-stone-900">{employee.workingSchedule?.name || '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Bank Info */}
        <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm overflow-hidden md:col-span-2">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70">
            <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider">Bank Information</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Bank Name</dt>
                <dd className="mt-1 text-xs font-semibold text-stone-900">{employee.bankName || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Account Name</dt>
                <dd className="mt-1 text-xs font-semibold text-stone-900">{employee.bankAccountName || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-bold text-stone-400 uppercase tracking-wider">Account Number</dt>
                <dd className="mt-1 text-xs font-extrabold text-stone-900 font-mono">{employee.bankAccountNumber || '-'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* View-Only Salary Structure Section */}
      <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            {isOwnEmployeeProfile ? 'My Salary Structure & Rules' : 'Assigned Salary Structure'}
          </h3>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-300">
            View Only
          </span>
        </div>
        <div className="p-6 space-y-4">
          {activeContract ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 mb-4">
                <div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Structure Name</span>
                  <span className="text-base font-black text-stone-950">{salaryStructure?.name || 'Default Contract Wage Structure'}</span>
                  {salaryStructure?.description && (
                    <p className="text-xs text-stone-500 mt-0.5 font-medium">{salaryStructure.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Base Contract Wage</span>
                    <span className="text-lg font-black text-stone-950 font-mono">{formatINR(activeContract.wage)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Contract Status</span>
                    <StatusBadge status={activeContract.status} />
                  </div>
                </div>
              </div>

              {salaryStructure?.rules?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-stone-100 text-xs">
                    <thead>
                      <tr className="text-left font-extrabold text-stone-400 uppercase text-[10px] tracking-wider">
                        <th className="pb-2.5 w-12">Seq</th>
                        <th className="pb-2.5">Code</th>
                        <th className="pb-2.5">Rule Name</th>
                        <th className="pb-2.5">Category</th>
                        <th className="pb-2.5">Computation Type</th>
                        <th className="pb-2.5 text-right">Value / Formula</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                      {salaryStructure.rules.map((rule) => {
                        let compDetail = '-';
                        if (rule.computationType === 'FIXED') {
                          compDetail = rule.category === 'BASIC' ? 'Contract Wage' : formatINR(rule.fixedAmount);
                        } else if (rule.computationType === 'PERCENTAGE') {
                          compDetail = `${rule.percentage}% of ${rule.percentageBase || 'BASIC'}`;
                        } else if (rule.computationType === 'FORMULA') {
                          compDetail = rule.formula || 'Formula';
                        }

                        let categoryBadge = 'bg-stone-100 text-stone-800';
                        if (rule.category === 'BASIC') categoryBadge = 'bg-amber-100 text-amber-900 border border-amber-300/60';
                        else if (rule.category === 'ALLOWANCE') categoryBadge = 'bg-emerald-100 text-emerald-900 border border-emerald-300/60';
                        else if (rule.category === 'DEDUCTION') categoryBadge = 'bg-rose-100 text-rose-900 border border-rose-300/60';

                        return (
                          <tr key={rule.id} className="hover:bg-stone-50/60">
                            <td className="py-2.5 font-mono text-stone-400 font-bold">{rule.sequence}</td>
                            <td className="py-2.5 font-mono font-black text-stone-950">{rule.code}</td>
                            <td className="py-2.5 font-bold text-stone-900">{rule.name}</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${categoryBadge}`}>
                                {rule.category}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-stone-500">{rule.computationType}</td>
                            <td className="py-2.5 text-right font-mono font-bold text-stone-950">{compDetail}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-stone-400 italic font-medium">
                  No custom salary rules attached to this structure. Standard contract wage applies.
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs font-medium text-stone-400">
              No active contract or salary structure assigned to this profile yet.
            </div>
          )}
        </div>
      </div>

      {/* Employee Payslips Section */}
      {canViewPayroll && (
        <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-purple-600" />
              {isOwnEmployeeProfile ? 'My Payslips & Salary Statements' : 'Employee Payslips'}
            </h3>
            <span className="text-xs font-bold text-stone-600 bg-stone-200/60 px-3 py-1 rounded-full">
              {payslips.length} Statements Available
            </span>
          </div>
          <div className="p-6">
            {payslipsLoading ? (
              <div className="py-8 flex justify-center"><LoadingSpinner /></div>
            ) : payslips.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium text-stone-400">
                No payslips found for this employee yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-100">
                  <thead>
                    <tr className="text-left text-[11px] font-extrabold text-stone-400 uppercase tracking-wider">
                      <th className="pb-3">Payrun / Period</th>
                      <th className="pb-3 text-right">Gross Salary</th>
                      <th className="pb-3 text-right">Deductions</th>
                      <th className="pb-3 text-right">Net Salary</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {payslips.slice((payslipPage - 1) * 10, payslipPage * 10).map(ps => (
                      <tr key={ps.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 whitespace-nowrap">
                          <div className="text-xs font-bold text-stone-900">{ps.payrun?.name || 'Payrun Batch'}</div>
                          <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                            {formatDate(ps.periodStart)} – {formatDate(ps.periodEnd)}
                          </div>
                        </td>
                        <td className="py-3.5 whitespace-nowrap text-xs font-medium text-stone-700 text-right">{formatINR(ps.grossSalary ?? ps.gross ?? 0)}</td>
                        <td className="py-3.5 whitespace-nowrap text-xs font-semibold text-rose-600 text-right">{formatINR(ps.totalDeductions ?? ps.deductions ?? 0)}</td>
                        <td className="py-3.5 whitespace-nowrap text-xs font-black text-emerald-600 text-right">{formatINR(ps.netSalary ?? ps.net ?? 0)}</td>
                        <td className="py-3.5 whitespace-nowrap text-center">
                          <StatusBadge status={ps.status} />
                        </td>
                        <td className="py-3.5 whitespace-nowrap text-right space-x-2">
                          <Link
                            to={`/payroll/payslips/${ps.id}`}
                            className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-700 transition-all text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                          <button
                            onClick={() => handleDownloadPDF(ps.id)}
                            className="px-3 py-1.5 rounded-full bg-amber-100 hover:bg-amber-400 hover:text-stone-950 text-amber-900 transition-all text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {payslips.length > 10 && (
              <div className="pt-4 border-t border-stone-100">
                <Pagination
                  page={payslipPage}
                  totalPages={Math.ceil(payslips.length / 10)}
                  onPageChange={setPayslipPage}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
