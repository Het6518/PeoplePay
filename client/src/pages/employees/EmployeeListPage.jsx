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
        limit: 20
      });
      setEmployees(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalCount(response.pagination?.total || (response.data?.length || 0));
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

  const { currentUser, isHR } = useAuth();
  const isHROrAdmin = isHR();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500">Total {totalCount} employees</p>
        </div>
        {isHROrAdmin && (
          <Link
            to="/employees/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Link>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              name="search"
              placeholder="Search employees..."
              value={filters.search}
              onChange={handleFilterChange}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <select
            name="departmentId"
            value={filters.departmentId}
            onChange={handleFilterChange}
            className="block w-full md:w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
            className="block w-full md:w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
            className="block w-full md:w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">All Types</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 border-l pl-4 border-gray-200">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-100 text-indigo-600' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <List className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-md ${viewMode === 'kanban' ? 'bg-gray-100 text-indigo-600' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <LayoutGrid className="h-5 w-5" />
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
            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr 
                      key={employee.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/employees/${employee.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                              <span className="font-medium leading-none text-indigo-700">{getInitials(employee.firstName, employee.lastName)}</span>
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.firstName} {employee.lastName}</div>
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.department?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.jobPosition || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${employeeTypeBadge(employee.employeeType)}`}>
                          {employee.employeeType?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={employee.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/employees/${employee.id}`} className="text-indigo-600 hover:text-indigo-900" onClick={e => e.stopPropagation()}>
                          View
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
                <div key={statusGroup} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col h-full">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200 capitalize">
                    {statusGroup.toLowerCase()}
                  </h3>
                  <div className="space-y-4 flex-1">
                    {employees.filter(e => e.status === statusGroup).map(employee => (
                      <div 
                        key={employee.id} 
                        className="bg-white p-4 rounded shadow-sm border border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                              <span className="font-medium leading-none text-indigo-700">{getInitials(employee.firstName, employee.lastName)}</span>
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{employee.firstName} {employee.lastName}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[150px]">{employee.jobPosition || 'No Position'}</p>
                            </div>
                          </div>
                          <Link to={`/employees/${employee.id}`} className="text-gray-400 hover:text-indigo-600" onClick={e => e.stopPropagation()}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                        <div className="mt-4 text-xs text-gray-500">
                          {employee.department?.name || 'No Department'} • {employee.employeeType?.replace('_', ' ')}
                        </div>
                      </div>
                    ))}
                    {employees.filter(e => e.status === statusGroup).length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No employees</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination 
              currentPage={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
          )}
        </>
      )}
    </div>
  );
}
