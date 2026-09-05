import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  UserCheck,
  RotateCcw,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { overtimeApi, departmentApi } from '../../services/apiServices';
import { useAuth } from '../../contexts/AuthContext';
import { formatINR, formatDate, getInitials } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import toast from 'react-hot-toast';

export default function OvertimePage() {
  const { user, currentUser, isHR: authIsHR } = useAuth();
  const effectiveUser = user || currentUser;
  const isEmployeeOnly = effectiveUser?.role === 'EMPLOYEE';
  const isHR = typeof authIsHR === 'function' ? authIsHR() : ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(effectiveUser?.role);

  // States
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [statusTab, setStatusTab] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [approveTarget, setApproveTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [correctTarget, setCorrectTarget] = useState(null);
  const [correctedHours, setCorrectedHours] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Fetch summary metrics
  const fetchSummary = useCallback(async () => {
    try {
      const res = await overtimeApi.getSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        departmentId: departmentId || undefined,
      });
      const data = res?.data?.data || res?.data || res;
      if (data && typeof data === 'object') {
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load overtime summary:', err);
    }
  }, [startDate, endDate, departmentId]);

  // Fetch departments for filter
  useEffect(() => {
    if (isHR) {
      departmentApi.getAll().then((res) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
        setDepartments(list);
      }).catch((err) => console.error('Failed to load departments:', err));
    }
  }, [isHR]);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        status: statusTab === 'ALL' ? undefined : statusTab,
        search: search.trim() || undefined,
        departmentId: departmentId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const apiCall = isEmployeeOnly ? overtimeApi.getMyOvertime(params) : overtimeApi.getAll(params);
      const res = await apiCall;

      const recordsList = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));

      const totalPagesCount = res?.totalPages || res?.pagination?.totalPages || res?.data?.pagination?.totalPages || 1;
      const totalItemsCount = res?.total || res?.pagination?.total || res?.data?.pagination?.total || recordsList.length;

      setRecords(recordsList);
      setTotalPages(totalPagesCount);
      setTotalCount(totalItemsCount);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch overtime records');
    } finally {
      setLoading(false);
    }
  }, [page, statusTab, search, departmentId, startDate, endDate, isEmployeeOnly]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Handlers
  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      setActionLoading(true);
      await overtimeApi.approve(approveTarget.id);
      toast.success('Overtime approved successfully');
      setApproveTarget(null);
      fetchRecords();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve overtime');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    try {
      setActionLoading(true);
      await overtimeApi.reject(rejectTarget.id, { rejectionReason: rejectionReason.trim() });
      toast.success('Overtime request rejected');
      setRejectTarget(null);
      setRejectionReason('');
      fetchRecords();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject overtime');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCorrect = async (e) => {
    e.preventDefault();
    if (!correctTarget) return;
    if (correctedHours === '' || Number(correctedHours) < 0) {
      toast.error('Please enter valid overtime hours');
      return;
    }
    if (!correctionReason.trim()) {
      toast.error('Audit reason is mandatory for manual corrections');
      return;
    }
    try {
      setActionLoading(true);
      await overtimeApi.correct(correctTarget.id, {
        overtimeHours: Number(correctedHours),
        correctionReason: correctionReason.trim(),
      });
      toast.success('Overtime record corrected successfully');
      setCorrectTarget(null);
      setCorrectedHours('');
      setCorrectionReason('');
      fetchRecords();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to correct overtime');
    } finally {
      setActionLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setDepartmentId('');
    setStartDate('');
    setEndDate('');
    setStatusTab('ALL');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-primary-600" />
            {isEmployeeOnly ? 'My Overtime History' : 'Overtime Management'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEmployeeOnly
              ? 'View your recorded overtime hours, multiplier rates, and approval status.'
              : 'Review, validate, approve, and manage employee overtime records linked to payroll.'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved OT Hours</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{summary.totalOvertimeHours} <span className="text-xs font-normal text-slate-500">hrs</span></h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved OT Cost</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">{formatINR(summary.totalOvertimeCost)}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Review</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{summary.pendingCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Count</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{summary.approvedCount}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'PENDING', label: 'Pending Approval' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setStatusTab(tab.id); setPage(1); }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  statusTab === tab.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Select Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isEmployeeOnly && (
              <div className="relative min-w-[180px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            )}

            {!isEmployeeOnly && departments.length > 0 && (
              <select
                value={departmentId}
                onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="text-xs text-slate-600 border-none focus:outline-none bg-transparent"
                title="Start Date"
              />
              <span className="text-slate-300 text-xs">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="text-xs text-slate-600 border-none focus:outline-none bg-transparent"
                title="End Date"
              />
            </div>

            {(search || departmentId || startDate || endDate || statusTab !== 'ALL') && (
              <button
                onClick={resetFilters}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No Overtime Records Found"
            message="No overtime records match your current filters or date range."
            action={
              (search || departmentId || startDate || endDate || statusTab !== 'ALL') && (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Clear Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  {!isEmployeeOnly && <th className="px-5 py-3.5">Employee</th>}
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-center">Expected / Worked</th>
                  <th className="px-5 py-3.5 text-center">Overtime Hours</th>
                  <th className="px-5 py-3.5 text-center">Rate & Multiplier</th>
                  <th className="px-5 py-3.5 text-right">Overtime Pay</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5">Audit & Notes</th>
                  {isHR && <th className="px-5 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {records.map((ot) => {
                  const emp = ot.employee;
                  const initials = emp ? getInitials(emp.firstName, emp.lastName) : 'EM';
                  return (
                    <tr key={ot.id} className="hover:bg-slate-50/70 transition-colors">
                      {!isEmployeeOnly && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-xs leading-tight">
                                {emp?.firstName} {emp?.lastName}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {emp?.employeeCode} • {emp?.department?.name || 'General'}
                              </p>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-700">
                        {formatDate(ot.date)}
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap text-xs">
                        <span className="text-slate-500">{ot.expectedHours}h</span>
                        <span className="text-slate-300 mx-1.5">/</span>
                        <span className="font-semibold text-slate-800">{ot.actualHours}h</span>
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700 border border-primary-150">
                          +{ot.overtimeHours} hrs
                        </span>
                        {ot.isManualCorrection && (
                          <span className="block text-[10px] text-amber-600 font-medium mt-0.5">
                            (Corrected from {ot.originalHours}h)
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap text-xs text-slate-600">
                        <span>{formatINR(ot.hourlyRate)}</span>
                        <span className="text-slate-400 mx-1">×</span>
                        <span className="font-semibold text-slate-800">{ot.multiplier}x</span>
                        <span className="text-[11px] text-slate-400 block font-normal">
                          (= {formatINR(ot.overtimeRate)}/hr)
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap text-xs font-bold text-emerald-600">
                        {formatINR(ot.overtimeAmount)}
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={ot.status} />
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[200px]">
                        {ot.status === 'APPROVED' && (
                          <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600 inline" />
                            <span>Approved by {ot.approvedByName || 'HR'}</span>
                          </div>
                        )}
                        {ot.status === 'REJECTED' && (
                          <div className="text-[11px] text-red-600">
                            <span className="font-semibold">Reason:</span> {ot.rejectionReason || 'Rejected by HR'}
                          </div>
                        )}
                        {ot.isManualCorrection && ot.correctionReason && (
                          <div className="text-[10px] text-amber-700 mt-0.5">
                            <span className="font-semibold">Edit note:</span> {ot.correctionReason}
                          </div>
                        )}
                        {ot.status === 'PENDING' && (
                          <span className="text-slate-400 italic text-[11px]">Awaiting review</span>
                        )}
                      </td>

                      {isHR && (
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {ot.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => setApproveTarget(ot)}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                  title="Approve Overtime"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setRejectTarget(ot); setRejectionReason(''); }}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                  title="Reject Overtime"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => {
                                setCorrectTarget(ot);
                                setCorrectedHours(ot.overtimeHours.toString());
                                setCorrectionReason('');
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                              title="Correct Overtime Hours"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* APPROVE CONFIRM DIALOG */}
      <ConfirmDialog
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        loading={actionLoading}
        title="Approve Overtime Request"
        message={
          approveTarget
            ? `Are you sure you want to approve ${approveTarget.overtimeHours} hours of overtime for ${approveTarget.employee?.firstName} ${approveTarget.employee?.lastName} (${formatINR(approveTarget.overtimeAmount)})? This will be credited to their next payroll run.`
            : ''
        }
        confirmText="Approve Overtime"
        confirmVariant="primary"
      />

      {/* REJECT MODAL */}
      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectionReason(''); }}
        title="Reject Overtime Request"
        size="md"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-800 text-xs">
            <p className="font-semibold mb-0.5">
              Rejecting {rejectTarget?.overtimeHours} hours OT for {rejectTarget?.employee?.firstName} {rejectTarget?.employee?.lastName}
            </p>
            <p>Please provide a mandatory reason for the audit trail.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Overtime was not pre-authorized by team lead..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setRejectTarget(null); setRejectionReason(''); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={actionLoading}
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* MANUAL CORRECTION MODAL */}
      <Modal
        open={!!correctTarget}
        onClose={() => { setCorrectTarget(null); setCorrectedHours(''); setCorrectionReason(''); }}
        title="Manual Overtime Correction (Audit Governed)"
        size="md"
      >
        <form onSubmit={handleCorrect} className="space-y-4">
          <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-blue-900 text-xs">
            <p className="font-semibold mb-0.5">
              Employee: {correctTarget?.employee?.firstName} {correctTarget?.employee?.lastName} ({correctTarget?.employee?.employeeCode})
            </p>
            <p>
              Current: <strong>{correctTarget?.overtimeHours} hrs</strong> • Rate: <strong>{formatINR(correctTarget?.overtimeRate)}/hr</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Corrected Overtime Hours <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              required
              value={correctedHours}
              onChange={(e) => setCorrectedHours(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-semibold"
            />
            {correctedHours !== '' && correctTarget && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                Recalculated Amount: {formatINR(Math.round(Number(correctedHours) * (correctTarget.overtimeRate || 0) * 100) / 100)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mandatory Audit Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Adjusted by HR per manager confirmation due to biometric sync discrepancy..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setCorrectTarget(null); setCorrectedHours(''); setCorrectionReason(''); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={actionLoading}
            >
              Save Correction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
