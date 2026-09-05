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
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <select 
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white px-4 py-2"
        >
          <option value="thisMonth">This Month</option>
          <option value="last3months">Last 3 Months</option>
          <option value="last6months">Last 6 Months</option>
          <option value="thisYear">This Year</option>
        </select>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard 
            title="Total Employees" 
            value={summary.totalEmployees} 
            icon={<Users className="text-blue-500" />} 
            gradient="bg-gradient-to-br from-blue-50 to-blue-100"
          />
          <KpiCard 
            title="Net Salary Paid" 
            value={formatINR(summary.netSalaryPaid)} 
            icon={<CreditCard className="text-emerald-500" />} 
            gradient="bg-gradient-to-br from-emerald-50 to-emerald-100"
          />
          <KpiCard 
            title="Payslips Generated" 
            value={summary.payslipsGenerated} 
            icon={<FileText className="text-purple-500" />} 
            gradient="bg-gradient-to-br from-purple-50 to-purple-100"
          />
          <KpiCard 
            title="Average Salary" 
            value={formatINR(summary.averageSalary)} 
            icon={<TrendingUp className="text-amber-500" />} 
            gradient="bg-gradient-to-br from-amber-50 to-amber-100"
          />
          <KpiCard 
            title="Attendance Health" 
            value={`${summary.attendanceHealth}%`} 
            icon={<Clock className="text-indigo-500" />} 
            gradient="bg-gradient-to-br from-indigo-50 to-indigo-100"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Trend */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Monthly Payroll Trend</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" tickFormatter={formatMonth} stroke="#6b7280" fontSize={12} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} stroke="#6b7280" fontSize={12} />
                <Tooltip formatter={(value) => formatINR(value)} labelFormatter={formatMonth} />
                <Legend />
                <Line type="monotone" dataKey="netSalary" name="Net Salary" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salary by Department */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Salary by Department</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={deptData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="department" stroke="#6b7280" fontSize={12} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} stroke="#6b7280" fontSize={12} />
                <Tooltip formatter={(value) => formatINR(value)} cursor={{fill: '#f3f4f6'}} />
                <Legend />
                <Bar dataKey="totalNet" name="Total Net Salary" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Attendance Overview</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={attendance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            Important Alerts
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-center mt-8">No active alerts</p>
            ) : (
              alerts.map((alert, idx) => (
                <div key={alert.id || alert.type || idx} className="p-3 border rounded-md flex items-start space-x-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    {alert.severity === 'ERROR' || alert.type === 'ERROR' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : null}
                    {alert.severity === 'WARNING' || alert.type === 'WARNING' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : null}
                    {alert.severity === 'INFO' || alert.type === 'INFO' ? <Info className="w-5 h-5 text-blue-500" /> : null}
                    {alert.severity === 'SUCCESS' || alert.type === 'SUCCESS' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : null}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      alert.severity === 'ERROR' || alert.type === 'ERROR' ? 'text-red-800' :
                      alert.severity === 'WARNING' || alert.type === 'WARNING' ? 'text-amber-800' :
                      alert.severity === 'SUCCESS' || alert.type === 'SUCCESS' ? 'text-emerald-800' : 'text-blue-800'
                    }`}>
                      {alert.message}
                    </p>
                    {alert.date && <p className="text-xs text-gray-500 mt-1">{formatDate(alert.date)}</p>}
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

function KpiCard({ title, value, icon, gradient }) {
  return (
    <div className={`p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col ${gradient}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium text-gray-600">{title}</h4>
        <div className="p-2 bg-white bg-opacity-60 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );
}
