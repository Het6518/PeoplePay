import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Edit, FileText, Calendar, Clock, DollarSign } from 'lucide-react';
import { employeeApi } from '../../services/apiServices';
import { getInitials, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const response = await employeeApi.getById(id);
      setEmployee(response.data);
    } catch (error) {
      toast.error('Failed to fetch employee details');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const { isHR, isPayroll } = useAuth();
  const canEdit = isHR();
  const canViewContracts = isHR();
  const canViewPayroll = isPayroll();

  if (loading) return <LoadingSpinner />;
  if (!employee) return <div>Employee not found</div>;

  const counts = employee._count || { contracts: 0, attendance: 0, timeOffRequests: 0, payslips: 0 };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-end">
        {canEdit && (
          <Link
            to={`/employees/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit className="h-4 w-4 mr-2" /> Edit Employee
          </Link>
        )}
      </div>

      {/* Header Profile Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
        <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 flex-shrink-0">
          <span className="text-3xl font-medium leading-none text-indigo-700">
            {getInitials(employee.firstName, employee.lastName)}
          </span>
        </span>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{employee.firstName} {employee.lastName}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span className="text-sm text-gray-500 font-medium">{employee.employeeCode}</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-700">{employee.jobPosition || 'No Position'}</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-700">{employee.department?.name || 'No Department'}</span>
            <span className="text-gray-300">•</span>
            <StatusBadge status={employee.status} />
          </div>
        </div>
      </div>

      {/* Smart Hub Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {canViewContracts ? (
          <Link to={`/contracts?employeeId=${id}`} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col items-center justify-center group">
            <FileText className="h-8 w-8 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-2xl font-bold text-gray-900">{counts.contracts}</span>
            <span className="text-sm font-medium text-gray-500">Contracts</span>
          </Link>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 opacity-60 flex flex-col items-center justify-center cursor-not-allowed">
            <FileText className="h-8 w-8 text-slate-400 mb-2" />
            <span className="text-2xl font-bold text-gray-900">{counts.contracts}</span>
            <span className="text-sm font-medium text-gray-500">Contracts</span>
          </div>
        )}
        
        <Link to={`/attendance?employeeId=${id}`} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-green-400 hover:shadow-md transition-all flex flex-col items-center justify-center group">
          <Clock className="h-8 w-8 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-2xl font-bold text-gray-900">{counts.attendance}</span>
          <span className="text-sm font-medium text-gray-500">Attendance</span>
        </Link>

        <Link to={`/time-off/requests?employeeId=${id}`} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center justify-center group">
          <Calendar className="h-8 w-8 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-2xl font-bold text-gray-900">{counts.timeOffRequests}</span>
          <span className="text-sm font-medium text-gray-500">Time Off</span>
        </Link>

        {canViewPayroll ? (
          <Link to={`/payroll/payslips?employeeId=${id}`} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all flex flex-col items-center justify-center group">
            <DollarSign className="h-8 w-8 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-2xl font-bold text-gray-900">{counts.payslips}</span>
            <span className="text-sm font-medium text-gray-500">Payslips</span>
          </Link>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 opacity-60 flex flex-col items-center justify-center cursor-not-allowed">
            <DollarSign className="h-8 w-8 text-slate-400 mb-2" />
            <span className="text-2xl font-bold text-gray-900">{counts.payslips}</span>
            <span className="text-sm font-medium text-gray-500">Payslips</span>
          </div>
        )}
      </div>

      {/* Info Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.email}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.phone || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">PAN Number</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono uppercase">{employee.panNumber || '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Employment Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Employment Details</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Employee Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{employee.employeeType?.replace('_', ' ')}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Joining Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.joiningDate ? formatDate(employee.joiningDate) : '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Manager</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {employee.manager ? (
                    <Link to={`/employees/${employee.manager.id}`} className="text-indigo-600 hover:underline">
                      {employee.manager.firstName} {employee.manager.lastName}
                    </Link>
                  ) : '-'}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Working Schedule</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.workingSchedule?.name || '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Bank Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden md:col-span-2">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Bank Information</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.bankName || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Account Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.bankAccountName || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Account Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.bankAccountNumber || '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

      </div>
    </div>
  );
}
