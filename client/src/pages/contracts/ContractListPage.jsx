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
    <div className="space-y-7 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Employment Contracts</h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5">Manage employee compensation, positions, and validity periods.</p>
        </div>
        <button
          onClick={openNewModal}
          className="btn-primary inline-flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </button>
      </div>

      <div className="bg-white p-4 rounded-[24px] border border-stone-200/70 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:w-64">
          <label className="sr-only">Filter by Employee</label>
          <select
            name="employeeId"
            value={filters.employeeId}
            onChange={handleFilterChange}
            className="input text-xs font-medium"
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
            className="input text-xs font-medium"
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
          action={<button onClick={openNewModal} className="btn-primary"><Plus size={16} className="mr-1"/> New Contract</button>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Position</th>
                <th>Wage (Monthly)</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id} className={`${contract.status === 'ACTIVE' ? 'bg-amber-50/20 border-l-4 border-l-amber-400' : ''}`}>
                  <td>
                    <div className="text-sm font-extrabold text-stone-900">
                      {contract.employee?.firstName} {contract.employee?.lastName}
                    </div>
                    <div className="text-xs font-medium text-stone-400">{contract.employee?.employeeCode}</div>
                  </td>
                  <td className="text-xs font-semibold text-stone-600">
                    {contract.position || contract.jobPosition || '-'}
                  </td>
                  <td className="text-sm font-extrabold text-stone-900 font-mono">
                    {formatINR(contract.wage)}
                  </td>
                  <td className="text-xs font-semibold text-stone-600">
                    {formatDate(contract.startDate)}
                  </td>
                  <td className="text-xs font-semibold text-stone-600">
                    {contract.endDate ? formatDate(contract.endDate) : 'Ongoing'}
                  </td>
                  <td>
                    <StatusBadge status={contract.status} />
                  </td>
                  <td className="text-right">
                    <button onClick={() => openEditModal(contract)} className="text-xs font-bold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200/80 px-3 py-1 rounded-full border border-stone-200/60 transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="p-4 border-t border-stone-100">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Contract Modal */}
      <Modal open={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingId ? 'Edit Contract' : 'New Contract'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Employee *</label>
            <select required name="employeeId" value={formData.employeeId} onChange={handleFormChange} disabled={editingId} className="input">
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <select name="departmentId" value={formData.departmentId} onChange={handleFormChange} className="input">
                <option value="">Select Department</option>
                {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Job Position</label>
              <input type="text" name="position" value={formData.position} onChange={handleFormChange} placeholder="e.g. Senior Developer" className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Wage (Monthly) *</label>
              <input type="number" required min="0" step="0.01" name="wage" value={formData.wage} onChange={handleFormChange} className="input font-mono" />
            </div>
            <div>
              <label className="label">Salary Structure</label>
              <select name="salaryStructureId" value={formData.salaryStructureId} onChange={handleFormChange} className="input">
                <option value="">Select Structure</option>
                {salaryStructures.map(struct => <option key={struct.id} value={struct.id}>{struct.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" required name="startDate" value={formData.startDate} onChange={handleFormChange} className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" name="endDate" value={formData.endDate} onChange={handleFormChange} className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" value={formData.status} onChange={handleFormChange} className="input">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary min-w-[120px]">
              {isSubmitting ? 'Saving...' : 'Save Contract'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
