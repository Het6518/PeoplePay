import React, { useState, useEffect } from 'react';
import { Check, X, Plus, Calendar, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { timeOffApi } from '../../services/apiServices';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';

export default function TimeOffPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Leave Management</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">Manage leave requests and track annual leave balances</p>
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6">
        <RequestsTab />
      </div>
    </div>
  );
}

function RequestsTab() {
  const { currentUser } = useAuth();
  const isHR = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(currentUser?.role);
  const isEmployee = currentUser?.role === 'EMPLOYEE';

  const [requests, setRequests] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('');
  const [types, setTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTypes();
    fetchBalance();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, typeFilter]);

  const fetchBalance = async () => {
    try {
      const res = await timeOffApi.getBalance({});
      setLeaveBalance(res.data || res || null);
    } catch (err) {
      console.error('Failed to fetch leave balance', err);
    }
  };

  const fetchTypes = async () => {
    try {
      const res = await timeOffApi.getTypes();
      setTypes(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (typeFilter) params.timeOffTypeId = typeFilter;
      
      const res = await timeOffApi.getRequests(params);
      setRequests(res.data || []);
      setTotalPages(res.totalPages || res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await timeOffApi.approve(id);
      toast.success('Request approved');
      fetchRequests();
      fetchBalance();
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    try {
      await timeOffApi.reject(id, { rejectionReason: reason });
      toast.success('Request rejected');
      fetchRequests();
      fetchBalance();
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  const hasPendingItems = isHR && requests.some(r => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Leave Entitlement & Balance Banner */}
      {leaveBalance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-stone-950 text-white rounded-[24px] shadow-sm border border-stone-800">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Annual Leave Quota</span>
            <p className="text-2xl font-black font-mono text-white mt-0.5">{leaveBalance.annualQuota} Days / yr</p>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Approved Leaves</span>
            <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">{leaveBalance.approvedDays} Days</p>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Pending Approval</span>
            <p className="text-2xl font-black font-mono text-amber-400 mt-0.5">{leaveBalance.pendingDays} Days</p>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Remaining Balance</span>
            <p className={`text-2xl font-black font-mono mt-0.5 ${leaveBalance.remainingDays > 5 ? 'text-emerald-400' : leaveBalance.remainingDays > 0 ? 'text-amber-400' : 'text-rose-500'}`}>
              {leaveBalance.remainingDays} Days
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-3">
          <select 
            className="rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-2 text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select 
            className="rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-2 text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All Leave Types</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Request Leave button visible ONLY to Employee role */}
        {isEmployee && (
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Request Leave
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white space-y-4">
          <table className="min-w-full divide-y divide-stone-200/60">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Dates</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Duration</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Reason</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Status</th>
                {hasPendingItems && <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {requests.map(req => {
                const empName = req.employee
                  ? `${req.employee.firstName || ''} ${req.employee.lastName || ''}`.trim() || req.employee.name
                  : 'Employee';
                const typeName = req.timeOffType?.name || req.leaveType?.name || 'Leave';

                return (
                  <tr key={req.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-900">{empName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full"
                        style={{ backgroundColor: `${req.timeOffType?.color || '#3b82f6'}18`, color: req.timeOffType?.color || '#2563eb' }}
                      >
                        {typeName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">
                      {formatDate(req.startDate)} to {formatDate(req.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-stone-700">{req.duration} days</td>
                    <td className="px-6 py-4 text-xs font-medium text-stone-700 max-w-xs">
                      {req.reason ? (
                        <span className="bg-stone-100/90 text-stone-800 px-2.5 py-1 rounded-lg border border-stone-200/80 inline-block text-xs font-medium">
                          {req.reason}
                        </span>
                      ) : (
                        <span className="text-stone-400 font-normal italic">No reason provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>
                    {hasPendingItems && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        {req.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleApprove(req.id)} className="p-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all" title="Approve">
                              <Check className="w-4 h-4"/>
                            </button>
                            <button onClick={() => handleReject(req.id)} className="p-1.5 rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition-all" title="Reject">
                              <X className="w-4 h-4"/>
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={hasPendingItems ? 7 : 6} className="px-6 py-12 text-center text-xs font-medium text-stone-400">
                    No leave requests found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="p-4 border-t border-stone-100 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
      
      {showModal && (
        <RequestModal 
          onClose={() => setShowModal(false)} 
          onSave={() => { setShowModal(false); fetchRequests(); fetchBalance(); }} 
          types={types}
          leaveBalance={leaveBalance}
        />
      )}
    </div>
  );
}

function RequestModal({ onClose, onSave, types, leaveBalance }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    timeOffTypeId: '', startDate: '', endDate: '', reason: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const employeeId = currentUser?.employeeId || currentUser?.employee?.id;

      if (!employeeId) {
        toast.error('No employee profile is linked to this account');
        return;
      }

      // Front-end validation: check if requested leave duration exceeds remaining leave balance
      if (leaveBalance && diffDays > leaveBalance.remainingDays) {
        toast.error(`Leave request exceeds your available leave balance! You requested ${diffDays} day(s), but only have ${leaveBalance.remainingDays} day(s) remaining out of your annual quota of ${leaveBalance.annualQuota} days.`);
        return;
      }

      const payload = {
        ...formData,
        employeeId,
        duration: diffDays
      };

      await timeOffApi.createRequest(payload);
      toast.success('Request submitted successfully');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Request Leave" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {leaveBalance && (
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-medium">
            <span>Available Balance: <strong>{leaveBalance.remainingDays} Days</strong></span>
            <span>Annual Quota: <strong>{leaveBalance.annualQuota} Days / yr</strong></span>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Leave Type</label>
          <select 
            required
            className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            value={formData.timeOffTypeId}
            onChange={e => setFormData({...formData, timeOffTypeId: e.target.value})}
          >
            <option value="">Select leave type...</option>
            {types.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isPaid === false ? '• Unpaid' : '• Paid'}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Start Date</label>
            <input type="date" required className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">End Date</label>
            <input type="date" required className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Reason</label>
          <textarea className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" rows="3" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Reason for leave..."></textarea>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50">Cancel</button>
          <button type="submit" className="px-6 py-2 rounded-full bg-amber-400 text-stone-950 text-xs font-bold hover:bg-amber-300 shadow-sm">Submit Request</button>
        </div>
      </form>
    </Modal>
  );
}
