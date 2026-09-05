import React, { useState, useEffect } from 'react';
import { Check, X, Plus, Calendar, Clock, Edit2, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { timeOffApi } from '../../services/apiServices';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function TimeOffPage({ initialTab = 'requests' }) {
  const { currentUser } = useAuth();
  const canManageTimeOff = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(currentUser?.role);
  const visibleTabs = canManageTimeOff ? ['requests', 'allocations', 'types'] : ['requests'];
  const [activeTab, setActiveTab] = useState(visibleTabs.includes(initialTab) ? initialTab : 'requests');

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab('requests');
    }
  }, [activeTab, visibleTabs]);
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Time Off Management</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">Manage leave requests, balances, and policies</p>
        </div>

        <div className="bg-stone-200/60 p-1.5 rounded-full inline-flex border border-stone-300/50 shadow-inner">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === 'requests' ? 'Requests' : tab === 'allocations' ? 'Allocations' : 'Leave Types';
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-md'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-300/50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6">
        {activeTab === 'requests' && <RequestsTab />}
        {activeTab === 'allocations' && <AllocationsTab />}
        {activeTab === 'types' && <LeaveTypesTab />}
      </div>
    </div>
  );
}

function RequestsTab() {
  const { currentUser } = useAuth();
  const isHR = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(currentUser?.role);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('');
  const [types, setTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    fetchTypes();
    fetchRequests();
  }, [statusFilter, typeFilter]);

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
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (typeFilter) params.timeOffTypeId = typeFilter;
      
      const res = await timeOffApi.getRequests(params);
      setRequests(res.data || []);
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
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  const hasPendingItems = isHR && requests.some(r => r.status === 'PENDING');

  return (
    <div className="space-y-6">
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

        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
          <table className="min-w-full divide-y divide-stone-200/60">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Dates</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Duration</th>
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
                  <td colSpan={hasPendingItems ? 6 : 5} className="px-6 py-12 text-center text-xs font-medium text-stone-400">
                    No leave requests found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {showModal && (
        <RequestModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchRequests(); }} types={types} />
      )}
    </div>
  );
}

function RequestModal({ onClose, onSave, types }) {
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

      const payload = {
        ...formData,
        employeeId,
        duration: diffDays
      };

      await timeOffApi.createRequest(payload);
      toast.success('Request submitted');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Request Leave" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Leave Type</label>
          <select 
            required
            className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            value={formData.timeOffTypeId}
            onChange={e => setFormData({...formData, timeOffTypeId: e.target.value})}
          >
            <option value="">Select leave type...</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
          <textarea className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" rows="3" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Reason for time off..."></textarea>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50">Cancel</button>
          <button type="submit" className="px-6 py-2 rounded-full bg-amber-400 text-stone-950 text-xs font-bold hover:bg-amber-300 shadow-sm">Submit Request</button>
        </div>
      </form>
    </Modal>
  );
}

function AllocationsTab() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await timeOffApi.getAllocations({});
      setAllocations(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch allocations');
    } finally {
      setLoading(false);
    }
  };

  const getRemainingColor = (remaining) => {
    if (remaining > 5) return 'text-emerald-600 font-bold';
    if (remaining > 0) return 'text-amber-600 font-bold';
    return 'text-rose-600 font-bold';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Allocation
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
          <table className="min-w-full divide-y divide-stone-200/60">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Leave Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Allocated</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Taken</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Remaining</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Valid Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {allocations.map(a => (
                <tr key={a.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-900">{a.employee?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-700">{a.leaveType?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">{a.amount} days</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">{a.taken || 0} days</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-xs ${getRemainingColor(a.amount - (a.taken || 0))}`}>
                    {a.amount - (a.taken || 0)} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-500">{a.validFrom} - {a.validTo}</td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-medium text-stone-400">
                    No leave allocations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeaveTypesTab() {
  const [types, setTypes] = useState([]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await timeOffApi.getTypes();
        setTypes(res.data || []);
      } catch (err) {
        toast.error('Failed to fetch types');
      }
    };
    fetchTypes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {types.map(t => (
          <div key={t.id} className="rounded-[24px] border border-stone-200/80 bg-stone-50/50 p-5 hover:bg-white hover:border-amber-400/80 transition-all shadow-sm group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: t.color || '#f59e0b' }}></div>
                <h3 className="text-base font-bold text-stone-900">{t.name}</h3>
              </div>
              <button className="p-1.5 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-200/60 transition-all">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-medium text-stone-500 mb-4 min-h-[36px]">{t.description || 'Standard leave policy'}</p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-200/60">
              <span className="bg-stone-200/70 text-stone-800 text-[11px] font-bold px-2.5 py-1 rounded-full">Unit: {t.unit}</span>
              {t.requiresAllocation && <span className="bg-amber-100/70 text-amber-900 text-[11px] font-bold px-2.5 py-1 rounded-full">Requires Allocation</span>}
              {t.requiresApproval && <span className="bg-indigo-100/70 text-indigo-900 text-[11px] font-bold px-2.5 py-1 rounded-full">Requires Approval</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
