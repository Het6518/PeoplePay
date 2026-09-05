import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info,
  MoreHorizontal,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Briefcase,
  Users,
  FileText,
  XCircle,
  Loader2,
} from 'lucide-react';
import { dashboardApi, timeOffApi } from '../services/apiServices';
import { formatDate } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { HolidayReviewWidget } from '../components/payroll/HolidayReviewWidget';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userName =
    currentUser?.employee?.firstName ||
    currentUser?.email?.split('@')[0] ||
    'Admin';

  const [summary, setSummary] = useState(null);
  const [attendanceChart, setAttendanceChart] = useState([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [matrixMode, setMatrixMode] = useState('team');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, pendingLeaveRes] = await Promise.all([
        dashboardApi.getSummary({}),
        timeOffApi.getRequests({ status: 'PENDING' }),
      ]);

      const summaryData = summaryRes.data || summaryRes || null;
      const pendingLeaveData = pendingLeaveRes.data || pendingLeaveRes || [];

      setSummary(summaryData);
      setPendingLeaveRequests(Array.isArray(pendingLeaveData) ? pendingLeaveData : []);

      // Dynamic Employee Composition (Full Time vs Contract vs Part Time)
      const ftCount = summaryData?.fullTimeCount || 0;
      const ptCount = (summaryData?.contractCount || 0) + (summaryData?.partTimeCount || 0);
      const totalEmp = summaryData?.totalEmployees || 1;

      setAttendanceChart([
        { name: 'Full Time', value: ftCount || Math.max(1, Math.round(totalEmp * 0.75)), color: '#FACC15' },
        { name: 'Contract & Part Time', value: ptCount || Math.max(0, Math.round(totalEmp * 0.25)), color: '#18181B' },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApproveLeave = async (id) => {
    setActionLoadingId(id);
    try {
      await timeOffApi.approve(id);
      toast.success('Leave request approved!');
      await fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve leave request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectLeave = async (id) => {
    setActionLoadingId(id);
    try {
      await timeOffApi.reject(id, { rejectionReason: 'Rejected from Dashboard' });
      toast.success('Leave request rejected');
      await fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject leave request');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  // Generate 28 dots for attendance matrix dynamically calculated from real database attendance counts
  const totalEmps = summary?.totalEmployees || 15;
  const totalPresent = summary?.presentToday || 0;
  const lateCount = summary?.lateToday || 0;
  const onTimeCount = summary?.onTimeToday ?? Math.max(0, totalPresent - lateCount);
  const absentCount = summary?.absentToday || 0;

  const totalDots = 28;
  const onTimeDots = Math.round((onTimeCount / Math.max(1, totalEmps)) * totalDots);
  const lateDots = Math.round((lateCount / Math.max(1, totalEmps)) * totalDots);
  const absentDots = Math.round((absentCount / Math.max(1, totalEmps)) * totalDots);

  const heatmapDots = Array.from({ length: totalDots }, (_, i) => {
    if (i < onTimeDots) return 'bg-emerald-400'; // Green for On-Time Present
    if (i < onTimeDots + lateDots) return 'bg-amber-400'; // Yellow/Amber for Late Present
    if (i < onTimeDots + lateDots + absentDots) return 'bg-rose-500'; // Red for Absent
    return 'bg-stone-700';
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Contextual Header & Top Summary Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
            Hello {userName}
          </h1>
        </div>

        {/* Top Summary Metrics Displayed directly from Database */}
        {summary && (
          <div className="flex items-center gap-6 sm:gap-8 bg-white/70 backdrop-blur-md px-6 py-3.5 rounded-3xl border border-stone-200/60 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
                  Employees
                </span>
                <span className="text-2xl font-black text-stone-950 tracking-tight font-mono">
                  {summary.totalEmployees || 0}
                </span>
              </div>
            </div>

            <div className="w-px h-8 bg-stone-200/80" />

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-950" />
              <div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
                  Pending Leaves
                </span>
                <span className="text-2xl font-black text-amber-600 tracking-tight font-mono">
                  {pendingLeaveRequests.length}
                </span>
              </div>
            </div>

            <div className="w-px h-8 bg-stone-200/80" />

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
                  Attendance
                </span>
                <span className="text-2xl font-black text-stone-950 tracking-tight font-mono">
                  {summary.attendanceHealth || 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HR Festival & Holiday Review Widget */}
      {currentUser?.role !== 'EMPLOYEE' && (
        <HolidayReviewWidget onHolidayUpdated={fetchDashboardData} />
      )}

      {/* 2-Column Command Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ============================================================ */}
        {/* MAIN AREA: Pending Leave Approvals (Red Box Requirement)    */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* PRIMARY LEAVE NOTIFICATIONS & PENDING APPROVALS BOX */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-700 flex items-center justify-center font-extrabold">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-950 uppercase tracking-wider flex items-center gap-2">
                    Leave Notifications & Approvals
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                      {pendingLeaveRequests.length} Pending
                    </span>
                  </h3>
                  <p className="text-xs font-medium text-stone-500 mt-0.5">
                    Review and approve employee leave requests pending your authorization.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/time-off/requests')}
                className="text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 px-4 py-2 rounded-full shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                All Requests <ChevronRight size={14} />
              </button>
            </div>

            {/* Pending Leave Requests List */}
            <div className="space-y-3.5 pt-1">
              {pendingLeaveRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 hover:bg-amber-100/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-stone-950 text-amber-400 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {(req.employee?.firstName?.[0] || 'E').toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-stone-950 flex items-center gap-2">
                        {req.employee?.firstName} {req.employee?.lastName}
                        <span className="text-xs font-mono text-stone-400 font-semibold">
                          ({req.employee?.employeeCode || 'EMP'})
                        </span>
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-extrabold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                          {req.timeOffType?.name || 'Leave'}
                        </span>
                        <span className="text-xs font-bold text-stone-600 font-mono">
                          {req.duration} {req.timeOffType?.unit === 'HOURS' ? 'Hours' : 'Days'}
                        </span>
                        <span className="text-xs font-semibold text-stone-500 font-mono">
                          ({formatDate(req.startDate)} – {formatDate(req.endDate)})
                        </span>
                      </div>
                      {req.reason && (
                        <p className="text-xs font-medium text-stone-600 italic mt-1.5 bg-white/80 px-3 py-1 rounded-xl border border-stone-200/60 inline-block">
                          "{req.reason}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    <button
                      onClick={() => handleApproveLeave(req.id)}
                      disabled={actionLoadingId === req.id}
                      className="px-4 py-2 rounded-full text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      {actionLoadingId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectLeave(req.id)}
                      disabled={actionLoadingId === req.id}
                      className="px-3.5 py-2 rounded-full text-xs font-bold bg-stone-200 text-stone-700 hover:bg-rose-100 hover:text-rose-700 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {pendingLeaveRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 bg-stone-50/60 rounded-2xl border border-dashed border-stone-200 text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                  <h4 className="text-sm font-black text-stone-900">No Pending Leave Approvals</h4>
                  <p className="text-xs font-medium text-stone-500 mt-1 max-w-sm">
                    All employee leave applications are processed. New leave requests will appear here for your immediate approval.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ============================================================ */}
        {/* RIGHT SIDEBAR (Yellow Box Area): Attendance & Composition     */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Top Card: Dark Attendance Command Card (Dynamic Interactive Individual Heat Maps) */}
          <div className="bg-stone-950 text-white rounded-[28px] p-6 border border-stone-800 shadow-xl flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-300">
                  Attendance Report
                </h3>
                <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-full border border-stone-800">
                  <button
                    onClick={() => setMatrixMode('team')}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-all ${
                      matrixMode === 'team'
                        ? 'bg-amber-400 text-stone-950'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Team Shift
                  </button>
                  <button
                    onClick={() => setMatrixMode('personal')}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-all ${
                      matrixMode === 'personal'
                        ? 'bg-amber-400 text-stone-950'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    My 28 Days
                  </button>
                </div>
              </div>

              {/* DYNAMIC Real Attendance Numbers (Fetched from Database) */}
              <div className="flex items-baseline gap-3 my-2">
                <span className="text-4xl font-black tracking-tight text-white font-mono">
                  {summary?.presentToday || 0}
                </span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  • {summary?.lateToday || 0}
                </span>
                <span className="text-xs text-stone-400 font-semibold">Late</span>
              </div>

              {/* DYNAMIC Individual Attendance Matrix Heatmap */}
              <div className="my-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                  <span>
                    {matrixMode === 'team'
                      ? `Live Shift Matrix (${summary?.presentToday || 0} Present / ${summary?.totalEmployees || 0} Total)`
                      : `My 28-Day Attendance History`}
                  </span>
                  <span className="text-amber-400">Hover dot for details</span>
                </div>

                {matrixMode === 'team' ? (
                  /* TEAM SHIFT MATRIX: Each dot maps to an actual employee */
                  <div className="grid grid-cols-7 gap-1.5">
                    {(summary?.teamAttendanceList || []).slice(0, 28).map((emp, idx) => {
                      let dotColor = 'bg-stone-700'; // Default Off / Not Checked In
                      if (['PRESENT', 'OVERTIME', 'MANUAL_CORRECTION'].includes(emp.status)) dotColor = 'bg-emerald-400';
                      else if (emp.status === 'LATE') dotColor = 'bg-amber-400';
                      else if (emp.status === 'ABSENT') dotColor = 'bg-rose-500';

                      return (
                        <div
                          key={emp.id || idx}
                          title={`${emp.name} (${emp.code}) - ${emp.status}${emp.checkIn ? ` at ${emp.checkIn}` : ''}`}
                          onClick={() => navigate('/attendance')}
                          className={`w-3.5 h-3.5 rounded-sm ${dotColor} hover:scale-125 transition-transform cursor-pointer shadow-xs`}
                        />
                      );
                    })}
                    {/* Fill up to 28 dots if employees count < 28 */}
                    {Array.from({ length: Math.max(0, 28 - (summary?.teamAttendanceList?.length || 0)) }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-3.5 h-3.5 rounded-sm bg-stone-800" title="Unassigned shift slot" />
                    ))}
                  </div>
                ) : (
                  /* PERSONAL 28-DAY HEATMAP: Each dot maps to a day in the user's history */
                  <div className="grid grid-cols-7 gap-1.5">
                    {(summary?.myAttendanceHistory || []).map((day, idx) => {
                      let dotColor = 'bg-stone-700';
                      if (['PRESENT', 'OVERTIME', 'MANUAL_CORRECTION'].includes(day.status)) dotColor = 'bg-emerald-400';
                      else if (day.status === 'LATE') dotColor = 'bg-amber-400';
                      else if (day.status === 'ABSENT') dotColor = 'bg-rose-500';

                      return (
                        <div
                          key={day.date || idx}
                          title={`${day.dayName} ${day.date}: ${day.status}`}
                          onClick={() => navigate('/attendance')}
                          className={`w-3.5 h-3.5 rounded-sm ${dotColor} hover:scale-125 transition-transform cursor-pointer shadow-xs`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* DYNAMIC Compliance Percentage & Legend */}
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 pt-3 border-t border-stone-800">
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Present</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Late</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Absent</span>
              </div>
              <div onClick={() => navigate('/attendance')} className="flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer">
                <span>Compliance: {summary?.attendanceHealth || 0}%</span>
                <ArrowUpRight size={14} className="text-amber-400" />
              </div>
            </div>
          </div>

          {/* Bottom Card: Employee Composition Donut Chart (Full HR Access) */}
          <div
            onClick={() => navigate('/employees')}
            className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[300px] cursor-pointer hover:border-amber-300/80 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                Employee Composition
              </h3>
              <MoreHorizontal size={16} className="text-stone-400 group-hover:text-amber-600 transition-colors" />
            </div>

            {/* Recharts Donut Chart */}
            <div className="relative h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {attendanceChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="text-xl font-black text-stone-950 tracking-tight font-mono block">
                  {summary?.totalEmployees || 0}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">
                  Total
                </span>
              </div>
            </div>

            {/* Bottom Percentage Breakdown */}
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-stone-700 pt-3 border-t border-stone-100">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Full Time ({summary?.fullTimeCount || 0})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-950" />
                Contract & Part Time ({(summary?.contractCount || 0) + (summary?.partTimeCount || 0)})
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
