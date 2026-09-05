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

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900">Attendance & Time Tracking</h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5">Track daily shift check-ins, check-outs, and worked hours.</p>
        </div>
      </div>

      {/* Today's Status Check-In / Check-Out Widget */}
      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-5 mb-6">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-stone-900 uppercase tracking-wider">Today's Shift Punch</h2>
            <p className="text-xs font-medium text-stone-400 mt-0.5">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          {punchStatus && (
            <StatusBadge status={punchStatus.status} />
          )}
        </div>

        {statusLoading ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : (
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-100 flex-1 sm:flex-none min-w-[140px]">
                <div className="p-2 bg-amber-400/20 text-amber-700 rounded-full flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Check In</p>
                  <p className="text-sm font-extrabold text-stone-900 font-mono">{formatTime(punchStatus?.checkIn)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-100 flex-1 sm:flex-none min-w-[140px]">
                <div className="p-2 bg-stone-900 text-amber-400 rounded-full flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Check Out</p>
                  <p className="text-sm font-extrabold text-stone-900 font-mono">{formatTime(punchStatus?.checkOut)}</p>
                </div>
              </div>

              {punchStatus?.workedHours !== null && punchStatus?.workedHours !== undefined && (
                <div className="text-left sm:text-center px-2 sm:px-4 sm:border-l border-stone-200 w-full sm:w-auto">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Worked Today</p>
                  <p className="text-base font-extrabold text-emerald-700 font-mono">{punchStatus.workedHours.toFixed(2)} hrs</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-stretch">
              {!punchStatus?.checkIn ? (
                <button
                  onClick={handleCheckIn}
                  className="btn-primary w-full lg:w-auto py-3 px-6 text-xs tracking-wider uppercase font-bold justify-center"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> CHECK IN NOW
                </button>
              ) : !punchStatus?.checkOut ? (
                <button
                  onClick={handleCheckOut}
                  className="btn w-full lg:w-auto bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold py-3 px-6 text-xs tracking-wider uppercase shadow-md justify-center"
                >
                  <Clock className="h-4 w-4 mr-1.5" /> CHECK OUT NOW
                </button>
              ) : (
                <div className="flex items-center justify-center w-full lg:w-auto text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-4 py-2.5 rounded-full">
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> Shift Completed Today
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* HR Filters */}
      {isHR && (
        <div className="bg-white p-4 rounded-[24px] border border-stone-200/70 shadow-sm flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <select name="employeeId" value={filters.employeeId} onChange={handleFilterChange} className="input w-full sm:w-56 text-xs font-medium">
            <option value="">All Employees</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
          </select>
          <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} className="input w-full sm:w-48 text-xs font-medium">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="input w-full sm:w-40 text-xs font-medium">
            <option value="">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="MISSING_CHECKOUT">Missing Checkout</option>
          </select>
        </div>
      )}

      {/* Attendance Logs Table */}
      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900">Attendance Logs</h3>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200/60">
              <thead className="bg-stone-50/80">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Check In</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Check Out</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Worked Hours</th>
                  <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-stone-500">Status</th>
                  {isHR && <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-stone-900">
                      {r.employee ? `${r.employee.firstName || ''} ${r.employee.lastName || ''}`.trim() || r.employee.name : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">{formatDate(r.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-semibold text-stone-800">{formatTime(r.checkIn)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-semibold text-stone-800">{formatTime(r.checkOut)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-emerald-700">{r.workedHours ? `${r.workedHours.toFixed(2)}h` : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><StatusBadge status={r.status} /></td>
                    {isHR && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        <button
                          onClick={() => openCorrectionModal(r)}
                          className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-700 transition-all font-bold"
                        >
                          Correct
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={isHR ? 7 : 6} className="px-6 py-12 text-center text-xs font-medium text-stone-400">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Correction Modal */}
      {isModalOpen && (
        <Modal open={true} onClose={() => setIsModalOpen(false)} title="Correct Attendance Record" size="md">
          <form onSubmit={handleCorrectionSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Check In Time</label>
              <input
                type="datetime-local"
                value={correctionData.checkIn}
                onChange={e => setCorrectionData({ ...correctionData, checkIn: e.target.value })}
                className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Check Out Time</label>
              <input
                type="datetime-local"
                value={correctionData.checkOut}
                onChange={e => setCorrectionData({ ...correctionData, checkOut: e.target.value })}
                className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Correction Reason / Notes *</label>
              <textarea
                required
                rows="3"
                value={correctionData.notes}
                onChange={e => setCorrectionData({ ...correctionData, notes: e.target.value })}
                className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none"
                placeholder="Reason for manual adjustment..."
              ></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50">Cancel</button>
              <button type="submit" className="px-6 py-2 rounded-full bg-amber-400 text-stone-950 text-xs font-bold hover:bg-amber-300 shadow-sm">Save Correction</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
