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
  const { currentUser } = useAuth();
  const employeeId = currentUser?.employeeId || currentUser?.employee?.id;
  const isEmployee = currentUser?.role === 'EMPLOYEE';
  const isHR = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(currentUser?.role);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Today's status for employee punch widget
  const [todayStatus, setTodayStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(!!employeeId);

  // Filters for HR
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    employeeId: isEmployee ? employeeId : '',
    departmentId: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState({
    id: '',
    checkIn: '',
    checkOut: '',
    notes: ''
  });

  useEffect(() => {
    if (isHR) {
      fetchOptions();
    }
  }, [isHR]);

  useEffect(() => {
    fetchRecords();
    fetchTodayStatus();
  }, [page, filters, currentUser]);

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
      if (!employeeId) {
        setTodayStatus(null);
        setStatusLoading(false);
        return;
      }
      
      const res = await attendanceApi.getToday();
      if (res.data) {
        setTodayStatus(res.data);
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
      const res = await attendanceApi.checkIn();
      toast.success('Checked in successfully');
      if (res.data) setTodayStatus(res.data);
      await fetchTodayStatus();
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check in failed');
      setStatusLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setStatusLoading(true);
      const res = await attendanceApi.checkOut();
      toast.success('Checked out successfully');
      if (res.data) setTodayStatus(res.data);
      await fetchTodayStatus();
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
      checkIn: record.checkIn ? new Date(record.checkIn).toISOString().slice(0,16) : '',
      checkOut: record.checkOut ? new Date(record.checkOut).toISOString().slice(0,16) : '',
      notes: record.correctionReason || record.notes || ''
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
        checkIn: correctionData.checkIn ? new Date(correctionData.checkIn).toISOString() : null,
        checkOut: correctionData.checkOut ? new Date(correctionData.checkOut).toISOString() : null,
        correctionReason: correctionData.notes,
        notes: correctionData.notes
      };
      
      await attendanceApi.correct(correctionData.id, payload);
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

  const getLocalDateKey = (date) => {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayRecord = records.find((record) => getLocalDateKey(record.date) === getLocalDateKey(new Date()));
  const punchStatus = todayStatus || todayRecord || null;

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
    <div className="space-y-7 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Attendance & Time Tracking</h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5">Track daily shift check-ins, check-outs, and worked hours.</p>
        </div>
      </div>

      {/* Today's Status Check-In / Check-Out Widget */}
      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-sm p-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-6">
          <div>
            <h2 className="text-base font-extrabold text-stone-900 uppercase tracking-wider">Today's Shift Punch</h2>
            <p className="text-xs font-medium text-stone-400 mt-0.5">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          {punchStatus && (
            <StatusBadge status={punchStatus.status} />
          )}
        </div>

        {statusLoading ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-100">
                <div className="p-2.5 bg-amber-400/20 text-amber-700 rounded-full">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Check In</p>
                  <p className="text-sm font-extrabold text-stone-900 font-mono">{formatTime(punchStatus?.checkIn)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-100">
                <div className="p-2.5 bg-stone-900 text-amber-400 rounded-full">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Check Out</p>
                  <p className="text-sm font-extrabold text-stone-900 font-mono">{formatTime(punchStatus?.checkOut)}</p>
                </div>
              </div>

              {punchStatus?.workedHours !== null && punchStatus?.workedHours !== undefined && (
                <div className="text-center px-4 border-l border-stone-200">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Worked Today</p>
                  <p className="text-base font-extrabold text-emerald-700 font-mono">{punchStatus.workedHours.toFixed(2)} hrs</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!punchStatus?.checkIn ? (
                <button
                  onClick={handleCheckIn}
                  className="btn-primary py-3 px-6 text-xs tracking-wider uppercase font-bold"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> CHECK IN NOW
                </button>
              ) : !punchStatus?.checkOut ? (
                <button
                  onClick={handleCheckOut}
                  className="btn bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold py-3 px-6 text-xs tracking-wider uppercase shadow-md"
                >
                  <Clock className="h-4 w-4 mr-1.5" /> CHECK OUT NOW
                </button>
              ) : (
                <div className="flex items-center text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-4 py-2.5 rounded-full">
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> Shift Completed Today
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* HR Filters */}
      {isHR && (
        <div className="bg-white p-4 rounded-[24px] border border-stone-200/70 shadow-sm flex flex-wrap gap-3 items-center">
          <select name="employeeId" value={filters.employeeId} onChange={handleFilterChange} className="input md:w-56 text-xs font-medium">
            <option value="">All Employees</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
          </select>
          <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} className="input md:w-48 text-xs font-medium">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="input md:w-40 text-xs font-medium">
            <option value="">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="MISSING_CHECKOUT">Missing Checkout</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="input text-xs font-medium" />
            <span className="text-stone-400 text-xs font-bold">to</span>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="input text-xs font-medium" />
          </div>
        </div>
      )}

      {/* Records Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                {isHR && <th>Employee</th>}
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Status</th>
                {isHR && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                      <Calendar className="h-3.5 w-3.5 text-stone-400" />
                      {formatDate(record.date)}
                    </div>
                  </td>
                  {isHR && (
                    <td className="text-xs font-extrabold text-stone-900">
                      {record.employee ? `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.trim() : '-'}
                    </td>
                  )}
                  <td className="text-xs font-semibold text-stone-600 font-mono">
                    {formatTime(record.checkIn)}
                    {record.isManualCorrection && <AlertTriangle className="inline h-3 w-3 text-amber-500 ml-1" title="Manually edited" />}
                  </td>
                  <td className="text-xs font-semibold text-stone-600 font-mono">
                    {formatTime(record.checkOut)}
                  </td>
                  <td className="text-xs font-extrabold text-stone-900 font-mono">
                    {record.workedHours !== null && record.workedHours !== undefined ? `${record.workedHours.toFixed(2)}h` : '-'}
                  </td>
                  <td>
                    <StatusBadge status={record.status} />
                  </td>
                  {isHR && (
                    <td className="text-right">
                      <button onClick={() => openCorrectionModal(record)} className="text-xs font-bold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200/80 px-3 py-1 rounded-full border border-stone-200/60 transition-colors">
                        Correct
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={isHR ? 7 : 6} className="px-6 py-12 text-center text-stone-400 text-xs font-medium">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="p-4 border-t border-stone-100">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* HR Correction Modal */}
      {isHR && (
        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Correct Attendance Record">
          <form onSubmit={handleCorrectionSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Check In Time</label>
                <input type="datetime-local" name="checkIn" value={correctionData.checkIn} onChange={e => setCorrectionData({...correctionData, checkIn: e.target.value})} className="input" />
              </div>
              <div>
                <label className="label">Check Out Time</label>
                <input type="datetime-local" name="checkOut" value={correctionData.checkOut} onChange={e => setCorrectionData({...correctionData, checkOut: e.target.value})} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Reason for Correction *</label>
              <textarea required rows={3} value={correctionData.notes} onChange={e => setCorrectionData({...correctionData, notes: e.target.value})} className="input" placeholder="Explain why manual correction is needed..."></textarea>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary min-w-[120px]">Save Correction</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
