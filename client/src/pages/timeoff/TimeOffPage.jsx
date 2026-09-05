import React, { useState, useEffect } from 'react';
import { Check, X, Plus, Calendar, Clock, Edit2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { timeOffApi } from '../../services/apiServices';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/formatters';

export default function TimeOffPage() {
  const [activeTab, setActiveTab] = useState('requests');
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Time Off Management</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {['requests', 'allocations', 'types'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab 
                    ? 'border-indigo-500 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'allocations' && <AllocationsTab />}
          {activeTab === 'types' && <LeaveTypesTab />}
        </div>
      </div>
    </div>
  );
}

function RequestsTab() {
  const { user } = useAuth();
  const isHR = user?.role === 'HR' || user?.role === 'HR_MANAGER' || user?.role === 'ADMIN';

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
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <select 
            className="border rounded-md px-3 py-2 text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select 
            className="border rounded-md px-3 py-2 text-sm"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-2" /> Request Leave
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {hasPendingItems && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map(req => {
              const empName = req.employee
                ? `${req.employee.firstName || ''} ${req.employee.lastName || ''}`.trim() || req.employee.name
                : 'Employee';
              const typeName = req.timeOffType?.name || req.leaveType?.name || 'Leave';

              return (
                <tr key={req.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{empName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full"
                      style={{ backgroundColor: `${req.timeOffType?.color || '#3b82f6'}20`, color: req.timeOffType?.color || '#3b82f6' }}
                    >
                      {typeName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(req.startDate)} to {formatDate(req.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.duration} days</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                        req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {req.status}
                    </span>
                  </td>
                  {hasPendingItems && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {req.status === 'PENDING' && (
                        <div className="flex space-x-2">
                          <button onClick={() => handleApprove(req.id)} className="text-green-600 hover:text-green-900"><Check className="w-5 h-5"/></button>
                          <button onClick={() => handleReject(req.id)} className="text-red-600 hover:text-red-900"><X className="w-5 h-5"/></button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {showModal && (
        <RequestModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchRequests(); }} types={types} />
      )}
    </div>
  );
}

function RequestModal({ onClose, onSave, types }) {
  const { user } = useAuth();
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

      const payload = {
        ...formData,
        employeeId: user?.employeeId,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Request Leave</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Leave Type</label>
            <select 
              required
              className="mt-1 block w-full border rounded-md px-3 py-2"
              value={formData.timeOffTypeId}
              onChange={e => setFormData({...formData, timeOffTypeId: e.target.value})}
            >
              <option value="">Select type...</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" required className="mt-1 block w-full border rounded-md px-3 py-2" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" required className="mt-1 block w-full border rounded-md px-3 py-2" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <textarea className="mt-1 block w-full border rounded-md px-3 py-2" rows="3" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}></textarea>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Submit</button>
          </div>
        </form>
      </div>
    </div>
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
    if (remaining > 5) return 'text-green-600 font-bold';
    if (remaining > 0) return 'text-amber-500 font-bold';
    return 'text-red-600 font-bold';
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" /> New Allocation
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taken</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Period</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allocations.map(a => (
              <tr key={a.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{a.employee?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{a.leaveType?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{a.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{a.taken || 0}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getRemainingColor(a.amount - (a.taken || 0))}`}>
                  {a.amount - (a.taken || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.validFrom} - {a.validTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    <div>
      <div className="flex justify-end mb-4">
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" /> New Type
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {types.map(t => (
          <div key={t.id} className="border rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: t.color || '#3b82f6' }}></div>
                <h3 className="text-lg font-medium">{t.name}</h3>
              </div>
              <button className="text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-2">{t.description}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">Unit: {t.unit}</span>
              {t.requiresAllocation && <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">Requires Allocation</span>}
              {t.requiresApproval && <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded">Requires Approval</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
