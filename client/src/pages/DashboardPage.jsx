import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  Users,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Search,
  Filter,
  MoreHorizontal,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { dashboardApi, employeeApi, payrollApi } from '../services/apiServices';
import { formatINR, formatDate, formatMonth } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const userName =
    currentUser?.employee?.firstName ||
    currentUser?.email?.split('@')[0] ||
    'Valentina';

  const [period, setPeriod] = useState('last3months');
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [
          summaryRes,
          trendRes,
          deptSalaryRes,
          attendanceRes,
          alertsRes,
          empRes,
        ] = await Promise.all([
          dashboardApi.getSummary({ period }),
          dashboardApi.getPayrollTrend({ period }),
          dashboardApi.getSalaryByDepartment({ period }),
          dashboardApi.getAttendance({ period }),
          dashboardApi.getAlerts(),
          employeeApi.getAll({ limit: 4, status: 'ACTIVE' }),
        ]);

        const summaryData = summaryRes.data || summaryRes || null;
        const trendData = (trendRes.data || trendRes || []).map((t) => ({
          ...t,
          netSalary: t.netSalary ?? t.net ?? 0,
        }));
        const deptSalaryData = (deptSalaryRes.data || deptSalaryRes || []).map(
          (d) => ({
            ...d,
            department: d.department || d.departmentName || '',
            totalNet: d.totalNet ?? 0,
          })
        );
        const attendanceData = attendanceRes.data || attendanceRes || null;
        const rawAlerts = alertsRes.data || alertsRes || [];
        const alertsData = Array.isArray(rawAlerts) ? rawAlerts : [];

        if (summaryData) {
          summaryData.netSalaryPaid =
            summaryData.netSalaryPaid ?? summaryData.totalNetPaid ?? 0;
        }

        setSummary(summaryData);
        setTrend(trendData);
        setDeptData(deptSalaryData);

        if (attendanceData) {
          setAttendance([
            { name: 'Full Time', value: attendanceData.PRESENT || 70, color: '#FACC15' },
            { name: 'Contract', value: attendanceData.LATE || 30, color: '#18181B' },
          ]);
        } else {
          setAttendance([
            { name: 'Full Time', value: 70, color: '#FACC15' },
            { name: 'Contract', value: 30, color: '#18181B' },
          ]);
        }

        setAlerts(alertsData);
        setRecentEmployees(empRes.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [period]);

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  // Generate 28 dots for attendance heatmap grid
  const heatmapDots = Array.from({ length: 28 }, (_, i) => {
    if (i % 7 === 1) return 'bg-amber-400';
    if (i % 9 === 0) return 'bg-stone-600';
    return 'bg-emerald-400';
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Contextual Header & Top Summary Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight">
            Hello {userName}
          </h1>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button className="bg-stone-950 text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-sm">
              All
            </button>
            <button
              onClick={() => setPeriod('thisMonth')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                period === 'thisMonth'
                  ? 'bg-amber-400 text-stone-950 shadow-sm'
                  : 'bg-white/80 border border-stone-200/80 text-stone-600 hover:text-stone-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod('last3months')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                period === 'last3months'
                  ? 'bg-amber-400 text-stone-950 shadow-sm'
                  : 'bg-white/80 border border-stone-200/80 text-stone-600 hover:text-stone-900'
              }`}
            >
              Last 3 Months
            </button>
            <button
              onClick={() => setPeriod('thisYear')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                period === 'thisYear'
                  ? 'bg-amber-400 text-stone-950 shadow-sm'
                  : 'bg-white/80 border border-stone-200/80 text-stone-600 hover:text-stone-900'
              }`}
            >
              This Year
            </button>
          </div>
        </div>

        {/* Top Summary Metrics Displayed as Clean Typography (Matching Reference Header Right Side) */}
        {summary && (
          <div className="flex items-center gap-6 sm:gap-8 bg-white/70 backdrop-blur-md px-6 py-3.5 rounded-3xl border border-stone-200/60 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
                  Employees
                </span>
                <span className="text-2xl font-black text-stone-950 tracking-tight">
                  {summary.totalEmployees || 0}
                </span>
              </div>
            </div>

            <div className="w-px h-8 bg-stone-200/80" />

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-950" />
              <div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
                  Payslips
                </span>
                <span className="text-2xl font-black text-stone-950 tracking-tight">
                  {summary.payslipsGenerated || 0}
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
                <span className="text-2xl font-black text-stone-950 tracking-tight">
                  {summary.attendanceHealth || 98}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3-Column Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Schedule & Operational HR Alerts (Approx 28%)   */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white/95 rounded-[28px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[580px]">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-stone-950 uppercase tracking-wider">
                  Schedule & Alerts
                </h3>
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-full">
                  <Calendar size={14} className="text-stone-600" />
                </div>
              </div>

              {/* Date Selector Strip */}
              <div className="grid grid-cols-4 gap-1.5 mb-5 bg-stone-50 p-1.5 rounded-2xl border border-stone-100 text-center">
                <div className="py-1.5 rounded-xl bg-amber-400 text-stone-950 font-black text-xs shadow-xs">
                  Wed <span className="block text-[10px] font-bold">25</span>
                </div>
                <div className="py-1.5 rounded-xl text-stone-500 font-bold text-xs hover:bg-white">
                  Thu <span className="block text-[10px]">26</span>
                </div>
                <div className="py-1.5 rounded-xl text-stone-500 font-bold text-xs hover:bg-white">
                  Fri <span className="block text-[10px]">27</span>
                </div>
                <div className="py-1.5 rounded-xl text-stone-500 font-bold text-xs hover:bg-white">
                  Sat <span className="block text-[10px]">28</span>
                </div>
              </div>

              {/* Active Scheduled Node (Matching Black Pill Card in Reference Left Side) */}
              <div className="mb-5 bg-stone-950 text-white p-4 rounded-2xl shadow-md border border-stone-800">
                <div className="flex items-center justify-between text-amber-400 text-[10px] font-black uppercase tracking-wider mb-1">
                  <span>Payroll Run Today</span>
                  <span>10:00 - 11:30 AM</span>
                </div>
                <h4 className="text-xs font-extrabold text-white">Monthly Salary Calculation</h4>
                <p className="text-[11px] text-stone-400 mt-1">Review prorated attendance and bonuses.</p>
              </div>

              {/* Vertical Timeline & Alerts List */}
              <div className="space-y-3.5 border-l-2 border-amber-300 pl-4 ml-2">
                {alerts.slice(0, 4).map((alert, idx) => (
                  <div key={alert.id || idx} className="relative group">
                    {/* Node Dot */}
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white ring-2 ring-stone-100" />
                    <div>
                      <p className="text-xs font-bold text-stone-900 group-hover:text-amber-600 transition-colors">
                        {alert.message}
                      </p>
                      <p className="text-[10px] font-semibold text-stone-400 mt-0.5">
                        {alert.type || 'SYSTEM'} • {formatDate(alert.date || new Date())}
                      </p>
                    </div>
                  </div>
                ))}

                {alerts.length === 0 && (
                  <div className="text-xs text-stone-500 font-semibold py-4">
                    <CheckCircle className="w-4 h-4 text-emerald-500 inline mr-1.5" />
                    All HR operations running smoothly.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Callout */}
            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-700">
              <span>View All Calendar Events</span>
              <ChevronRight size={14} className="text-stone-400" />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MIDDLE COLUMN: Recent Payroll Table & Line Chart (Approx 46%)*/}
        {/* ============================================================ */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Top Card: Salary & Disbursement Table (Matching Reference Middle Top) */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-stone-950 uppercase tracking-wider">
                Salary & Employee Disbursement
              </h3>
              <button className="text-stone-400 hover:text-stone-900 p-1">
                <Search size={16} />
              </button>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-stone-100">
              {recentEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="py-3.5 flex items-center justify-between hover:bg-amber-50/30 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-950 text-amber-400 font-extrabold text-xs flex items-center justify-center">
                      {(emp.firstName?.[0] || 'E').toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        {emp.firstName} {emp.lastName}
                      </h4>
                      <p className="text-[10px] font-semibold text-stone-400">
                        {emp.jobPosition || emp.department?.name || 'Full Time'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-stone-950 font-mono block">
                      {formatINR(emp.wage || 45000)}
                    </span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      PAID
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Card: Monthly Payroll Trend Line Chart (Matching Reference Middle Bottom) */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-stone-950 uppercase tracking-wider">
                Payroll Statistics
              </h3>
              <span className="text-xs font-extrabold text-stone-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200/60">
                Monthly Net Trend
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer>
                <LineChart data={trend} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F0E6" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} stroke="#A1A1AA" fontSize={10} fontWeight={700} />
                  <YAxis tickFormatter={(val) => `₹${val / 1000}k`} stroke="#A1A1AA" fontSize={10} fontWeight={700} />
                  <Tooltip formatter={(val) => formatINR(val)} labelFormatter={formatMonth} />
                  <Line
                    type="monotone"
                    dataKey="netSalary"
                    stroke="#EAB308"
                    strokeWidth={3.5}
                    dot={{ r: 5, fill: '#18181B', strokeWidth: 2, stroke: '#EAB308' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Dark Attendance Card & Donut Chart (Approx 26%) */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Top Card: Dark Anchor Card — "Attendance Report" (Matching Reference Right Top Dark Card) */}
          <div className="bg-stone-950 text-white rounded-[28px] p-5 border border-stone-800 shadow-xl flex flex-col justify-between min-h-[260px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-300">
                  Attendance Report
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Large Metric Display */}
              <div className="flex items-baseline gap-3 my-2">
                <span className="text-4xl font-black tracking-tight text-white font-mono">
                  63
                </span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  • 12
                </span>
                <span className="text-xs text-stone-400 font-semibold">Late</span>
              </div>

              {/* Attendance Heatmap / Dot Matrix Visual Grid */}
              <div className="my-4">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                  Live Shift Matrix
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {heatmapDots.map((dotClass, idx) => (
                    <div key={idx} className={`w-3.5 h-3.5 rounded-sm ${dotClass}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 pt-3 border-t border-stone-800">
              <span>Shift Compliance: 96%</span>
              <ArrowUpRight size={14} className="text-amber-400" />
            </div>
          </div>

          {/* Bottom Card: Donut Composition Chart (Matching Reference Right Bottom Card) */}
          <div className="bg-white/95 rounded-[28px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[280px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                Employee Composition
              </h3>
              <MoreHorizontal size={16} className="text-stone-400" />
            </div>

            {/* Recharts Donut Chart */}
            <div className="relative h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendance}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {attendance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="text-xl font-black text-stone-950 tracking-tight font-mono block">
                  {summary?.totalEmployees || 345}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">
                  Total
                </span>
              </div>
            </div>

            {/* Bottom Percentage Breakdown */}
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-stone-700 pt-2 border-t border-stone-100">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                70% Full Time
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-950" />
                30% Contract
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
