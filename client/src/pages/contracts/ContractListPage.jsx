import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { contractApi, employeeApi, departmentApi, salaryApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';

export default function ContractListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const employeeIdParam = searchParams.get('employeeId') || '';

  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [filters, setFilters] = useState({
    employeeId: employeeIdParam,
    status: ''
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    departmentId: '',
    position: '',
    wage: '',
    salaryStructureId: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchContracts();
    // Update URL if filter changes
    if (filters.employeeId) {
      setSearchParams({ employeeId: filters.employeeId });
    } else {
      setSearchParams({});
    }
  }, [page, filters]);

  const fetchOptions = async () => {
    try {
      const [empRes, deptRes, structRes] = await Promise.all([
        employeeApi.getAll({ limit: 500 }),
        departmentApi.getAll(),
        salaryApi.getStructures()
      ]);
      setEmployees(empRes.data || []);
      setDepartments(deptRes.data || []);
      setSalaryStructures(structRes.data || (Array.isArray(structRes) ? structRes : []));
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const response = await contractApi.getAll({
        ...filters,
        page,
        limit: 15
      });
      setContracts(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch contracts');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({
      employeeId: filters.employeeId || '',
      departmentId: '',
      position: '',
      wage: '',
      salaryStructureId: salaryStructures[0]?.id || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (contract) => {
    setEditingId(contract.id);
    setFormData({
      employeeId: contract.employeeId,
      departmentId: contract.departmentId || '',
      position: contract.position || '',
      wage: contract.wage,
      salaryStructureId: contract.salaryStructureId || '',
      startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
      endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
      status: contract.status
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        employeeId: formData.employeeId,
        position: formData.position || undefined,
        wage: Number(formData.wage),
        status: formData.status || 'ACTIVE',
        startDate: new Date(formData.startDate).toISOString(),
      };
      if (formData.endDate) {
        payload.endDate = new Date(formData.endDate).toISOString();
      }
      if (formData.departmentId) {
        payload.departmentId = formData.departmentId;
      }
      if (formData.salaryStructureId) {
        payload.salaryStructureId = formData.salaryStructureId;
      }

      if (editingId) {
        await contractApi.update(editingId, payload);
        toast.success('Contract updated successfully');
      } else {
        await contractApi.create(payload);
        toast.success('Contract created successfully');
      }
      setIsModalOpen(false);
      fetchContracts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500">Manage employee employment contracts.</p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:w-64">
          <label className="sr-only">Filter by Employee</label>
          <select
            name="employeeId"
            value={filters.employeeId}
            onChange={handleFilterChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label className="sr-only">Filter by Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : contracts.length === 0 ? (
        <EmptyState 
          title="No contracts found" 
          description="Try adjusting your filters or create a new contract."
          icon={FileText}
          action={{ label: 'New Contract', onClick: openNewModal }}
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wage</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contracts.map((contract) => (
                <tr key={contract.id} className={`hover:bg-gray-50 ${contract.status === 'ACTIVE' ? 'border-l-4 border-l-green-400' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {contract.employee?.firstName} {contract.employee?.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{contract.employee?.employeeCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contract.position || contract.jobPosition || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatINR(contract.wage)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(contract.startDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contract.endDate ? formatDate(contract.endDate) : 'Ongoing'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={contract.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEditModal(contract)} className="text-indigo-600 hover:text-indigo-900">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </div>
      )}

      {/* Contract Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingId ? 'Edit Contract' : 'New Contract'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Employee *</label>
            <select required name="employeeId" value={formData.employeeId} onChange={handleFormChange} disabled={editingId} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100">
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <select name="departmentId" value={formData.departmentId} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option value="">Select Department</option>
                {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Job Position</label>
              <input type="text" name="position" value={formData.position} onChange={handleFormChange} placeholder="e.g. Senior Software Engineer" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Wage (Monthly) *</label>
              <input type="number" required min="0" step="0.01" name="wage" value={formData.wage} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Salary Structure</label>
              <select name="salaryStructureId" value={formData.salaryStructureId} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option value="">Select Structure</option>
                {salaryStructures.map(struct => <option key={struct.id} value={struct.id}>{struct.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date *</label>
              <input type="date" required name="startDate" value={formData.startDate} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" name="endDate" value={formData.endDate} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select name="status" value={formData.status} onChange={handleFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Contract'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
