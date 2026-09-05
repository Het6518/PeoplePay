import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceApi, employeeApi, departmentApi } from '../../services/apiServices';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../utils/formatters';
import { Clock, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Today's status for employee
  const [todayStatus, setTodayStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(isEmployee);

  // Filters for HR
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    employeeId: isEmployee ? user.employeeId : '',
    departmentId: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState({
    id: '',
    checkInTime: '',
    checkOutTime: '',
    notes: ''
  });

  useEffect(() => {
    if (isHR) {
      fetchOptions();
    }
  }, [isHR]);

  useEffect(() => {
    fetchRecords();
    if (isEmployee) {
      fetchTodayStatus();
    }
  }, [page, filters, isEmployee]);

  const fetchOptions = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([
        employeeApi.getAll({ limit: 500 }),
        departmentApi.getAll()
      ]);
      setEmployees(empRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await attendanceApi.getAll({
        ...filters,
        page,
        limit: 20
      });
      setRecords(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      // Assuming api has a way to get today's record for current user, else query by date
      const today = new Date().toISOString().split('T')[0];
      const res = await attendanceApi.getAll({ employeeId: user.employeeId, startDate: today, endDate: today });
      if (res.data && res.data.length > 0) {
        setTodayStatus(res.data[0]);
      } else {
        setTodayStatus(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setStatusLoading(true);
      await attendanceApi.checkIn();
      toast.success('Checked in successfully');
      fetchTodayStatus();
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check in failed');
      setStatusLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setStatusLoading(true);
      await attendanceApi.checkOut();
      toast.success('Checked out successfully');
      fetchTodayStatus();
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check out failed');
      setStatusLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const openCorrectionModal = (record) => {
    setCorrectionData({
      id: record.id,
      checkInTime: record.checkInTime ? new Date(record.checkInTime).toISOString().slice(0,16) : '',
      checkOutTime: record.checkOutTime ? new Date(record.checkOutTime).toISOString().slice(0,16) : '',
      notes: record.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!correctionData.notes) {
        toast.error('Reason for correction is required');
        return;
      }
      
      const payload = {
        checkInTime: correctionData.checkInTime ? new Date(correctionData.checkInTime).toISOString() : null,
        checkOutTime: correctionData.checkOutTime ? new Date(correctionData.checkOutTime).toISOString() : null,
        notes: correctionData.notes,
        isManualEntry: true
      };
      
      await attendanceApi.update(correctionData.id, payload);
      toast.success('Attendance corrected successfully');
      setIsModalOpen(false);
      fetchRecords();
    } catch (error) {
      toast.error('Failed to correct attendance');
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PRESENT': return 'bg-green-100 text-green-800';
      case 'LATE': return 'bg-amber-100 text-amber-800';
      case 'ABSENT': return 'bg-red-100 text-red-800';
      case 'OVERTIME': return 'bg-purple-100 text-purple-800';
      case 'MISSING_CHECKOUT': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
      </div>

      {/* Employee Today's Status Card */}
      {isEmployee && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Today's Status</h2>
          {statusLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-full">
                  <Clock className="h-8 w-8 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {todayStatus ? (todayStatus.checkOutTime ? 'Completed' : 'Working') : 'Not Checked In'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {todayStatus?.checkInTime && (
                  <div className="text-center px-4 border-r border-gray-200">
                    <p className="text-sm text-gray-500">Check In</p>
                    <p className="font-medium">{formatTime(todayStatus.checkInTime)}</p>
                  </div>
                )}
                {todayStatus?.checkOutTime && (
                  <div className="text-center px-4 border-r border-gray-200">
                    <p className="text-sm text-gray-500">Check Out</p>
                    <p className="font-medium">{formatTime(todayStatus.checkOutTime)}</p>
                  </div>
                )}
                {todayStatus?.workedHours > 0 && (
                  <div className="text-center px-4">
                    <p className="text-sm text-gray-500">Hours</p>
                    <p className="font-medium">{todayStatus.workedHours.toFixed(2)}h</p>
                  </div>
                )}
              </div>

              <div>
                {!todayStatus ? (
                  <button onClick={handleCheckIn} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm transition-colors text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" /> CHECK IN
                  </button>
                ) : !todayStatus.checkOutTime ? (
                  <button onClick={handleCheckOut} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-sm transition-colors text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" /> CHECK OUT
                  </button>
                ) : (
                  <span className={`px-4 py-2 rounded-full font-medium ${getStatusColor(todayStatus.status)}`}>
                    {todayStatus.status.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HR Filters */}
      {isHR && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
          <select name="employeeId" value={filters.employeeId} onChange={handleFilterChange} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            <option value="">All Employees</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
          </select>
          <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            <option value="">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="MISSING_CHECKOUT">Missing Checkout</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            <span className="text-gray-500">to</span>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
        </div>
      )}

      {/* Records Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                {isHR && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {isHR && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(record.date)}
                    </div>
                  </td>
                  {isHR && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {record.employee ? `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.trim() : '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTime(record.checkInTime)}
                    {record.isManualEntry && <AlertTriangle className="inline h-3 w-3 text-amber-500 ml-1" title="Manually edited" />}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTime(record.checkOutTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {record.workedHours ? `${record.workedHours.toFixed(2)}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${getStatusColor(record.status)}`}>
                      {record.status.replace('_', ' ')}
                    </span>
                  </td>
                  {isHR && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openCorrectionModal(record)} className="text-indigo-600 hover:text-indigo-900">
                        Correct
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={isHR ? 7 : 6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </div>
      )}

      {/* HR Correction Modal */}
      {isHR && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Correct Attendance">
          <form onSubmit={handleCorrectionSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Check In Time</label>
                <input type="datetime-local" name="checkInTime" value={correctionData.checkInTime} onChange={e => setCorrectionData({...correctionData, checkInTime: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Check Out Time</label>
                <input type="datetime-local" name="checkOutTime" value={correctionData.checkOutTime} onChange={e => setCorrectionData({...correctionData, checkOutTime: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason for Correction *</label>
              <textarea required rows={3} value={correctionData.notes} onChange={e => setCorrectionData({...correctionData, notes: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Explain why manual correction is needed..."></textarea>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Cancel</button>
              <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Save Correction</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
