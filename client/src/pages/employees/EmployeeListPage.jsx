import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, List, LayoutGrid, Filter, MoreVertical, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeApi, departmentApi } from '../../services/apiServices';
import { getInitials, employeeTypeBadge } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { currentUser, isHR } = useAuth();
  const isHROrAdmin = isHR();
  
  useEffect(() => {
    const empId = currentUser?.employeeId || currentUser?.employee?.id;
    if (currentUser?.role === 'EMPLOYEE' && empId) {
      navigate(`/employees/${empId}`, { replace: true });
    }
  }, [currentUser]);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  
  const [filters, setFilters] = useState({
    search: '',
    departmentId: '',
    status: '',
    employeeType: ''
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page, filters]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll();
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await employeeApi.getAll({
        ...filters,
        page,
        limit: 10
      });
      setEmployees(response.data || []);
      setTotalPages(response.totalPages || response.pagination?.totalPages || 1);
      setTotalCount(response.total || response.pagination?.total || (response.data?.length || 0));
    } catch (error) {
      toast.error('Failed to fetch employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">People Directory</h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5">Total {totalCount} team members across departments</p>
        </div>
        {isHROrAdmin && (
          <Link
            to="/employees/new"
            className="btn-primary inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Link>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-[24px] border border-stone-200/70 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              name="search"
              placeholder="Search people..."
              value={filters.search}
              onChange={handleFilterChange}
              className="pl-10 input text-xs font-medium"
            />
          </div>
          
          <select
            name="departmentId"
            value={filters.departmentId}
            onChange={handleFilterChange}
            className="input md:w-48 text-xs font-medium"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="input md:w-40 text-xs font-medium"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          <select
            name="employeeType"
            value={filters.employeeType}
            onChange={handleFilterChange}
            className="input md:w-44 text-xs font-medium"
          >
            <option value="">All Types</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
          </select>
        </div>

        <div className="flex items-center space-x-1 border-l pl-4 border-stone-200/80">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-400 hover:text-stone-800 hover:bg-stone-100'}`}
            title="List View"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-full transition-all ${viewMode === 'kanban' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-400 hover:text-stone-800 hover:bg-stone-100'}`}
            title="Kanban Board"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : employees.length === 0 ? (
        <EmptyState 
          title="No employees found" 
          description="Try adjusting your search or filter criteria."
          icon={Filter}
        />
      ) : (
        <>
          {viewMode === 'list' ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Manager</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr 
                      key={employee.id} 
                      className="cursor-pointer"
                      onClick={() => navigate(`/employees/${employee.id}`)}
                    >
                      <td>
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-amber-400 font-extrabold text-xs shadow-sm">
                              {getInitials(employee.firstName, employee.lastName)}
                            </span>
                          </div>
                          <div className="ml-3.5">
                            <div className="text-sm font-extrabold text-stone-900">{employee.firstName} {employee.lastName}</div>
                            <div className="text-xs font-medium text-stone-400">{employee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs font-semibold text-stone-600">
                        {employee.department?.name || '-'}
                      </td>
                      <td className="text-xs font-semibold text-stone-600">
                        {employee.jobPosition || '-'}
                      </td>
                      <td className="text-xs font-semibold text-stone-600">
                        {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '-'}
                      </td>
                      <td>
                        <span className="inline-flex rounded-full px-3 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                          {employee.employeeType?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={employee.status} />
                      </td>
                      <td className="text-right">
                        <Link to={`/employees/${employee.id}`} className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full border border-amber-200/60 transition-colors" onClick={e => e.stopPropagation()}>
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['ACTIVE', 'INACTIVE', 'TERMINATED'].map(statusGroup => (
                <div key={statusGroup} className="bg-white p-5 rounded-[24px] border border-stone-200/70 shadow-sm flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                    <h3 className="text-sm font-extrabold text-stone-900 capitalize tracking-tight">
                      {statusGroup.toLowerCase()}
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {employees.filter(e => e.status === statusGroup).length}
                    </span>
                  </div>
                  <div className="space-y-3.5 flex-1">
                    {employees.filter(e => e.status === statusGroup).map(employee => (
                      <div 
                        key={employee.id} 
                        className="bg-stone-50/70 p-4 rounded-2xl border border-stone-100 hover:border-amber-400 hover:bg-white hover:shadow-md cursor-pointer transition-all"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-amber-400 text-xs font-extrabold shadow-sm">
                              {getInitials(employee.firstName, employee.lastName)}
                            </span>
                            <div>
                              <p className="text-xs font-extrabold text-stone-900">{employee.firstName} {employee.lastName}</p>
                              <p className="text-[11px] font-medium text-stone-400 truncate max-w-[130px]">{employee.jobPosition || 'No Position'}</p>
                            </div>
                          </div>
                          <Link to={`/employees/${employee.id}`} className="text-stone-400 hover:text-amber-600 p-1" onClick={e => e.stopPropagation()}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                        <div className="mt-3 text-[11px] font-semibold text-stone-500 border-t border-stone-200/50 pt-2 flex items-center justify-between">
                          <span>{employee.department?.name || 'No Dept'}</span>
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{employee.employeeType?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                    {employees.filter(e => e.status === statusGroup).length === 0 && (
                      <p className="text-xs font-medium text-stone-400 text-center py-6">No employees in this column</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination 
                page={page} 
                totalPages={totalPages} 
                onPageChange={setPage} 
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
