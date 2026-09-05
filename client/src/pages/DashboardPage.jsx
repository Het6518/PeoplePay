import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { 
  TrendingUp, Users, CreditCard, BarChart3, Clock, AlertTriangle, CheckCircle, Info, FileText 
} from 'lucide-react';
import { dashboardApi } from '../services/apiServices';
import { formatINR, formatDate, formatMonth } from '../utils/formatters';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#9ca3af'];

export default function DashboardPage() {
  const [period, setPeriod] = useState('last3months');
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [timeOff, setTimeOff] = useState(null);
  const [alerts, setAlerts] = useState([]);
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
          timeOffRes,
          alertsRes
        ] = await Promise.all([
          dashboardApi.getSummary({ period }),
          dashboardApi.getPayrollTrend({ period }),
          dashboardApi.getSalaryByDepartment({ period }),
          dashboardApi.getAttendance({ period }),
          dashboardApi.getTimeOff({ period }),
          dashboardApi.getAlerts()
        ]);

        const summaryData = summaryRes.data || summaryRes || null;
        const trendData = (trendRes.data || trendRes || []).map(t => ({ ...t, netSalary: t.netSalary ?? t.net ?? 0 }));
        const deptSalaryData = (deptSalaryRes.data || deptSalaryRes || []).map(d => ({ ...d, department: d.department || d.departmentName || '', totalNet: d.totalNet ?? 0 }));
        const attendanceData = attendanceRes.data || attendanceRes || null;
        const timeOffData = timeOffRes.data || timeOffRes || null;
        const rawAlerts = alertsRes.data || alertsRes || [];
        const alertsData = Array.isArray(rawAlerts) ? rawAlerts : [];

        if (summaryData) {
          summaryData.netSalaryPaid = summaryData.netSalaryPaid ?? summaryData.totalNetPaid ?? 0;
        }

        setSummary(summaryData);
        setTrend(trendData);
        setDeptData(deptSalaryData);
        
        if (attendanceData) {
          setAttendance([
            { name: 'Present', value: attendanceData.PRESENT || 0 },
            { name: 'Late', value: attendanceData.LATE || 0 },
            { name: 'Absent', value: attendanceData.ABSENT || 0 },
            { name: 'Overtime', value: attendanceData.OVERTIME || 0 },
            { name: 'Missing', value: attendanceData.MISSING_CHECKOUT || 0 }
          ]);
        }
        
        setTimeOff(timeOffData);
        setAlerts(alertsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [period]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Welcome to PeoplePay360</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">Here is a summary of your organization's HR & payroll status.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-full border border-stone-200/90 bg-white px-5 py-2.5 text-xs font-bold text-stone-800 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          >
            <option value="thisMonth">This Month</option>
            <option value="last3months">Last 3 Months</option>
            <option value="last6months">Last 6 Months</option>
            <option value="thisYear">This Year</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <div className="p-6 rounded-[24px] bg-white border border-stone-200/70 shadow-sm flex flex-col justify-between hover:shadow-card transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Employees</span>
              <div className="p-2.5 rounded-full bg-stone-100 text-stone-900">
                <Users size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-stone-900 tracking-tight">{summary.totalEmployees}</div>
          </div>

          <div className="p-6 rounded-[24px] bg-stone-900 text-white shadow-xl shadow-stone-950/10 flex flex-col justify-between hover:scale-[1.01] transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Net Salary Paid</span>
              <div className="p-2.5 rounded-full bg-amber-400/20 text-amber-400">
                <CreditCard size={18} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-400 tracking-tight truncate">{formatINR(summary.netSalaryPaid)}</div>
          </div>

          <div className="p-6 rounded-[24px] bg-white border border-stone-200/70 shadow-sm flex flex-col justify-between hover:shadow-card transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Payslips</span>
              <div className="p-2.5 rounded-full bg-purple-50 text-purple-700">
                <FileText size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-stone-900 tracking-tight">{summary.payslipsGenerated}</div>
          </div>

          <div className="p-6 rounded-[24px] bg-white border border-stone-200/70 shadow-sm flex flex-col justify-between hover:shadow-card transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Average Salary</span>
              <div className="p-2.5 rounded-full bg-amber-50 text-amber-600">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-stone-900 tracking-tight truncate">{formatINR(summary.averageSalary)}</div>
          </div>

          <div className="p-6 rounded-[24px] bg-amber-400 text-stone-950 shadow-md shadow-amber-400/20 flex flex-col justify-between hover:scale-[1.01] transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-stone-900/80 uppercase tracking-wider">Attendance</span>
              <div className="p-2.5 rounded-full bg-stone-950/15 text-stone-950">
                <Clock size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-stone-950 tracking-tight">{summary.attendanceHealth}%</div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {/* Payroll Trend */}
        <div className="bg-white p-7 rounded-[24px] border border-stone-200/70 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight">Monthly Payroll Trend</h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60">Net Disbursement</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F0E6" />
                <XAxis dataKey="month" tickFormatter={formatMonth} stroke="#A1A1AA" fontSize={11} fontWeight={600} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} stroke="#A1A1AA" fontSize={11} fontWeight={600} />
                <Tooltip formatter={(value) => formatINR(value)} labelFormatter={formatMonth} />
                <Legend />
                <Line type="monotone" dataKey="netSalary" name="Net Salary" stroke="#F59E0B" strokeWidth={3.5} dot={{ r: 5, fill: '#18181B', strokeWidth: 2, stroke: '#F59E0B' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salary by Department */}
        <div className="bg-white p-7 rounded-[24px] border border-stone-200/70 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight">Salary by Department</h3>
            <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200/60">Department Breakdown</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={deptData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F0E6" />
                <XAxis dataKey="department" stroke="#A1A1AA" fontSize={11} fontWeight={600} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} stroke="#A1A1AA" fontSize={11} fontWeight={600} />
                <Tooltip formatter={(value) => formatINR(value)} cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }} />
                <Legend />
                <Bar dataKey="totalNet" name="Total Net Salary" fill="#18181B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Pie Chart */}
        <div className="bg-white p-7 rounded-[24px] border border-stone-200/70 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight">Attendance Overview</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">Live Breakdown</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={attendance}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {attendance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white p-7 rounded-[24px] border border-stone-200/70 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              Important Alerts
            </h3>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60">
              {alerts.length} System Alerts
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-stone-400">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-stone-600">All systems operating normally</p>
                <p className="text-xs text-stone-400">No active warnings or errors detected</p>
              </div>
            ) : (
              alerts.map((alert, idx) => (
                <div key={alert.id || alert.type || idx} className="p-4 rounded-2xl border border-stone-100 bg-stone-50/60 flex items-start gap-3 hover:bg-stone-50 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    {alert.severity === 'ERROR' || alert.type === 'ERROR' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : null}
                    {alert.severity === 'WARNING' || alert.type === 'WARNING' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : null}
                    {alert.severity === 'INFO' || alert.type === 'INFO' ? <Info className="w-4 h-4 text-sky-500" /> : null}
                    {alert.severity === 'SUCCESS' || alert.type === 'SUCCESS' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : null}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${
                      alert.severity === 'ERROR' || alert.type === 'ERROR' ? 'text-rose-900' :
                      alert.severity === 'WARNING' || alert.type === 'WARNING' ? 'text-amber-900' :
                      alert.severity === 'SUCCESS' || alert.type === 'SUCCESS' ? 'text-emerald-900' : 'text-sky-900'
                    }`}>
                      {alert.message}
                    </p>
                    {alert.date && <p className="text-[11px] font-medium text-stone-400 mt-1">{formatDate(alert.date)}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
