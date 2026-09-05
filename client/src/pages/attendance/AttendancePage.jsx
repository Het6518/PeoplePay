import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceApi, employeeApi, departmentApi } from '../../services/apiServices';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { GeofenceMap } from '../../components/map/GeofenceMap';
import { useGeolocation } from '../../hooks/useGeolocation';
import { formatDate } from '../../utils/formatters';
import { Clock, CheckCircle, MapPin, RefreshCw, AlertTriangle, ShieldCheck, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { Pagination } from '../../components/ui/Pagination';

// Haversine distance calculator on frontend for real-time visual feedback
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371000;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export default function AttendancePage() {
  const { currentUser } = useAuth();
  const employeeId = currentUser?.employeeId || currentUser?.employee?.id;
  const isEmployee = currentUser?.role === 'EMPLOYEE';
  const isHR = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(currentUser?.role);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Today's status & resolved office location
  const [todayData, setTodayData] = useState({ record: null, location: null });
  const [statusLoading, setStatusLoading] = useState(!!employeeId);
  const [geofenceError, setGeofenceError] = useState(null);

  // GPS Geolocation Hook
  const { getCurrentLocation, location: userGps, error: gpsError, loading: gpsLoading } = useGeolocation();

  // Filters for HR
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    employeeId: isEmployee ? employeeId : '',
    departmentId: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // Modal state for manual correction
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState({
    id: '',
    checkIn: '',
    checkOut: '',
    notes: '',
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
        departmentApi.getAll(),
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
        limit: 20,
      });
      setRecords(response.data || []);
      setTotalPages(response.totalPages || response.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      if (!employeeId) {
        setTodayData({ record: null, location: null });
        setStatusLoading(false);
        return;
      }

      const res = await attendanceApi.getToday();
      if (res.data) {
        setTodayData({
          record: res.data.record || res.data,
          location: res.data.location || null,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setStatusLoading(false);
    }
  };

  // Perform GPS Check In
  const handleCheckIn = async () => {
    setGeofenceError(null);
    try {
      setStatusLoading(true);
      const coords = await getCurrentLocation();
      const res = await attendanceApi.checkIn({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });

      toast.success('Checked in successfully!');
      if (res.data?.record) setTodayData((prev) => ({ ...prev, record: res.data.record }));
      await fetchTodayStatus();
      fetchRecords();
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.message || 'Check in failed.';
      setGeofenceError(apiMsg);
      toast.error(apiMsg);
    } finally {
      setStatusLoading(false);
    }
  };

  // Perform GPS Check Out
  const handleCheckOut = async () => {
    setGeofenceError(null);
    try {
      setStatusLoading(true);
      const coords = await getCurrentLocation();
      const res = await attendanceApi.checkOut({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });

      toast.success('Checked out successfully!');
      if (res.data?.record) setTodayData((prev) => ({ ...prev, record: res.data.record }));
      await fetchTodayStatus();
      fetchRecords();
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.message || 'Check out failed.';
      setGeofenceError(apiMsg);
      toast.error(apiMsg);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const openCorrectionModal = (record) => {
    setCorrectionData({
      id: record.id,
      checkIn: record.checkIn ? new Date(record.checkIn).toISOString().slice(0, 16) : '',
      checkOut: record.checkOut ? new Date(record.checkOut).toISOString().slice(0, 16) : '',
      notes: record.correctionReason || record.notes || '',
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
        notes: correctionData.notes,
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

  const todayRecord = todayData.record;
  const officeLocation = todayData.location;

  // Real-time distance evaluation
  const currentDistance =
    userGps && officeLocation
      ? calculateHaversineDistance(
          userGps.latitude,
          userGps.longitude,
          officeLocation.latitude,
          officeLocation.longitude
        )
      : null;

  const isInsideGeofence =
    currentDistance !== null && officeLocation?.radiusMeters
      ? currentDistance <= officeLocation.radiusMeters
      : false;

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <MapPin className="text-indigo-600" /> Attendance & GPS Geofence
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Real-time GPS geofenced shift check-ins, check-outs, and location verification.
          </p>
        </div>

        <button
          onClick={() => getCurrentLocation()}
          disabled={gpsLoading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={16} className={gpsLoading ? 'animate-spin' : ''} />
          {gpsLoading ? 'Acquiring GPS...' : 'Refresh GPS Location'}
        </button>
      </div>

      {/* Today's Shift Punch & Geofence Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Punch Controls & Info */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-soft p-5 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-5 mb-6">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wider">
                  Today's Shift Punch
                </h2>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {todayRecord && <StatusBadge status={todayRecord.status} />}
            </div>

            {/* Geofence Status Error Alert */}
            {geofenceError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-3 animate-fadeIn">
                <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-900">Geofence Check Failed</p>
                  <p className="mt-1">{geofenceError}</p>
                </div>
              </div>
            )}

            {/* GPS & Office Location Info Pill */}
            {officeLocation ? (
              <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-indigo-600" /> Assigned Geofence
                  </span>
                  <span className="font-semibold text-slate-900 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                    {officeLocation.name} ({officeLocation.radiusMeters}m radius)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 font-medium">GPS Distance: </span>
                    <strong
                      className={
                        currentDistance !== null
                          ? isInsideGeofence
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                          : 'text-slate-600'
                      }
                    >
                      {currentDistance !== null ? `${currentDistance}m` : 'Acquiring GPS...'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">GPS Accuracy: </span>
                    <strong className="text-slate-700">
                      {userGps?.accuracy ? `±${Math.round(userGps.accuracy)}m` : 'Unknown'}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                <span>No specific office location assigned. Defaulting to system office bounds.</span>
              </div>
            )}

            {statusLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Clock size={16} className="text-amber-600" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Check In</span>
                    </div>
                    <p className="text-base font-extrabold text-slate-900 font-mono">
                      {formatTime(todayRecord?.checkIn)}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Clock size={16} className="text-indigo-600" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Check Out</span>
                    </div>
                    <p className="text-base font-extrabold text-slate-900 font-mono">
                      {formatTime(todayRecord?.checkOut)}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Navigation size={16} className="text-emerald-600" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Worked Today</span>
                    </div>
                    <p className="text-base font-extrabold text-emerald-600 font-mono">
                      {todayRecord?.workedHours !== null && todayRecord?.workedHours !== undefined
                        ? `${todayRecord.workedHours.toFixed(2)} hrs`
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* Punch Action Buttons */}
                <div className="pt-2">
                  {!todayRecord?.checkIn ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={statusLoading || gpsLoading}
                      className="btn-primary w-full py-4 text-sm tracking-wider uppercase font-bold justify-center shadow-lg shadow-indigo-200"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" /> CHECK IN WITH GPS GEOFENCE
                    </button>
                  ) : !todayRecord?.checkOut ? (
                    <button
                      onClick={handleCheckOut}
                      disabled={statusLoading || gpsLoading}
                      className="btn w-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold py-4 text-sm tracking-wider uppercase shadow-lg justify-center"
                    >
                      <Clock className="h-5 w-5 mr-2" /> CHECK OUT WITH GPS GEOFENCE
                    </button>
                  ) : (
                    <div className="flex items-center justify-center w-full text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-3.5 rounded-2xl">
                      <CheckCircle className="h-5 w-5 mr-2 text-emerald-600" /> Shift Completed Today
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Interactive Geofence Map */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-soft p-5 sm:p-7 flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Live Geofence Radar</span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                isInsideGeofence
                  ? 'bg-emerald-100 text-emerald-800'
                  : userGps
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isInsideGeofence ? 'Inside Allowed Zone' : userGps ? 'Outside Allowed Zone' : 'Standby'}
            </span>
          </h3>

          <div className="flex-1 min-h-[300px]">
            <GeofenceMap
              officeLocation={officeLocation}
              userLocation={userGps}
              distanceMeters={currentDistance}
              isInsideGeofence={isInsideGeofence}
              height="320px"
            />
          </div>
        </div>
      </div>

      {/* HR Filters */}
      {isHR && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <select
            name="employeeId"
            value={filters.employeeId}
            onChange={handleFilterChange}
            className="input-field w-full sm:w-56 text-xs font-medium"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
          <select
            name="departmentId"
            value={filters.departmentId}
            onChange={handleFilterChange}
            className="input-field w-full sm:w-48 text-xs font-medium"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="input-field w-full sm:w-40 text-xs font-medium"
          >
            <option value="">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="OVERTIME">Overtime</option>
            <option value="OUTSIDE_GEOFENCE">Outside Geofence</option>
            <option value="MISSING_CHECKOUT">Missing Checkout</option>
          </select>
        </div>
      )}

      {/* Attendance Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Attendance Logs & GPS Evidence</h3>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Check In</th>
                  <th className="px-6 py-3.5">Check Out</th>
                  <th className="px-6 py-3.5">Worked Hours</th>
                  <th className="px-6 py-3.5">Location / GPS Distance</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  {isHR && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                      {r.employee
                        ? `${r.employee.firstName || ''} ${r.employee.lastName || ''}`.trim() || r.employee.name
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{formatDate(r.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-slate-800">
                      {formatTime(r.checkIn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-slate-800">
                      {formatTime(r.checkOut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-emerald-600">
                      {r.workedHours ? `${r.workedHours.toFixed(2)}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="font-semibold text-slate-800">
                        {r.attendanceLocation?.name || 'Default Office'}
                      </div>
                      {r.checkInDistanceMeters !== null && r.checkInDistanceMeters !== undefined && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          Dist: {r.checkInDistanceMeters}m (Acc: ±{Math.round(r.checkInAccuracy || 0)}m)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    {isHR && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openCorrectionModal(r)}
                          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition-all font-bold"
                        >
                          Correct
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={isHR ? 8 : 7} className="px-6 py-12 text-center text-slate-400">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex justify-center">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Correction Modal */}
      {isModalOpen && (
        <Modal open={true} onClose={() => setIsModalOpen(false)} title="Correct Attendance Record" size="md">
          <form onSubmit={handleCorrectionSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Check In Time
              </label>
              <input
                type="datetime-local"
                value={correctionData.checkIn}
                onChange={(e) => setCorrectionData({ ...correctionData, checkIn: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Check Out Time
              </label>
              <input
                type="datetime-local"
                value={correctionData.checkOut}
                onChange={(e) => setCorrectionData({ ...correctionData, checkOut: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Correction Reason / Notes *
              </label>
              <textarea
                required
                rows="3"
                value={correctionData.notes}
                onChange={(e) => setCorrectionData({ ...correctionData, notes: e.target.value })}
                className="input-field"
                placeholder="Reason for manual adjustment..."
              ></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Save Correction
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
