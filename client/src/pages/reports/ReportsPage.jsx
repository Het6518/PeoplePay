import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, RefreshCw, BarChart2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { reportApi, departmentApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('payroll');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Reports & Analytics</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">Generate operational, attendance, and payroll audit summaries</p>
        </div>

        <div className="bg-stone-200/60 p-1.5 rounded-full inline-flex border border-stone-300/50 shadow-inner">
          {[
            { id: 'payroll', label: 'Payroll' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'timeoff', label: 'Time Off' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-stone-900 text-white shadow-md'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-300/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6">
        {activeTab === 'payroll' && <PayrollReport />}
        {activeTab === 'attendance' && <AttendanceReport />}
        {activeTab === 'timeoff' && <TimeOffReport />}
      </div>
    </div>
  );
}

function PayrollReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    periodStart: '',
    periodEnd: '',
    departmentId: '',
  });

  useEffect(() => {
    departmentApi.getAll().then(res => setDepartments(Array.isArray(res) ? res : [])).catch(console.error);
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getPayroll(filters);
      setReportData(res);
    } catch (err) {
      console.error('Failed to load payroll report', err);
    } finally {
      setLoading(false);
    }
  };

  const payslips = reportData?.payslips || [];
  const totals = reportData?.totals || { gross: 0, deductions: 0, net: 0, count: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/60">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Period Start</label>
          <input
            type="date"
            value={filters.periodStart}
            onChange={(e) => setFilters({ ...filters, periodStart: e.target.value })}
            className="rounded-2xl border border-stone-200 px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Period End</label>
          <input
            type="date"
            value={filters.periodEnd}
            onChange={(e) => setFilters({ ...filters, periodEnd: e.target.value })}
            className="rounded-2xl border border-stone-200 px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Department</label>
          <select
            value={filters.departmentId}
            onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
            className="rounded-2xl border border-stone-200 px-3.5 py-2 text-xs bg-white focus:outline-none min-w-[160px]"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end self-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary rounded-full px-5 py-2 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : payslips.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-xs font-medium">
          No payroll records found for the selected parameters.
        </div>
      ) : (
        <div className="overflow-hidden border border-stone-200/80 rounded-2xl bg-white">
          <table className="min-w-full divide-y divide-stone-200/60">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Department</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Payrun / Period</th>
                <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Gross Salary</th>
                <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Deductions</th>
                <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Net Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {payslips.map((ps) => (
                <tr key={ps.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                    {ps.employee ? `${ps.employee.firstName} ${ps.employee.lastName}` : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-600">
                    {ps.employee?.department?.name || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-600">
                    <div>{ps.payrun?.name}</div>
                    <div className="text-[11px] text-stone-400">{formatDate(ps.periodStart)} - {formatDate(ps.periodEnd)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-700 text-right">{formatINR(ps.grossSalary)}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-rose-600 text-right">{formatINR(ps.totalDeductions)}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-emerald-600 text-right">{formatINR(ps.netSalary)}</td>
                </tr>
              ))}
              <tr className="bg-stone-900 text-white font-bold">
                <td colSpan="3" className="px-4 py-4 text-xs uppercase tracking-wider text-stone-300 text-right">Totals ({totals.count} records):</td>
                <td className="px-4 py-4 text-xs font-bold text-stone-200 text-right">{formatINR(totals.gross)}</td>
                <td className="px-4 py-4 text-xs font-bold text-rose-400 text-right">{formatINR(totals.deductions)}</td>
                <td className="px-4 py-4 text-sm font-black text-amber-400 text-right">{formatINR(totals.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AttendanceReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({ periodStart: '', periodEnd: '' });

  useEffect(() => {
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getAttendance(filters);
      setReportData(res);
    } catch (err) {
      console.error('Failed to load attendance report', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/60">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.periodStart}
            onChange={(e) => setFilters({ ...filters, periodStart: e.target.value })}
            className="rounded-2xl border border-stone-200 px-3.5 py-2 text-xs bg-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">End Date</label>
          <input
            type="date"
            value={filters.periodEnd}
            onChange={(e) => setFilters({ ...filters, periodEnd: e.target.value })}
            className="rounded-2xl border border-stone-200 px-3.5 py-2 text-xs bg-white focus:outline-none"
          />
        </div>
        <div className="flex items-end self-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary rounded-full px-5 py-2 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : summary.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-xs font-medium">
          No attendance summary records found for the selected date range.
        </div>
      ) : (
        <div className="overflow-hidden border border-stone-200/80 rounded-2xl bg-white">
          <table className="min-w-full divide-y divide-stone-200/60">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Department</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-stone-500">Present</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-stone-500">Late</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-stone-500">Absent</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-stone-500">Overtime</th>
                <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Total Worked Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {summary.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                    {row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-600">
                    {row.employee?.department?.name || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-center text-emerald-600">{row.present || 0}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-center text-amber-600">{row.late || 0}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-center text-rose-600">{row.absent || 0}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-center text-indigo-600">{row.overtime || 0}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-stone-900 text-right">
                    {row.totalWorkedHours ? `${row.totalWorkedHours.toFixed(1)} hrs` : '0.0 hrs'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TimeOffReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({ periodStart: '', periodEnd: '' });

  useEffect(() => {
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getTimeOff(filters);
      setReportData(res);
    } catch (err) {
      console.error('Failed to load time off report', err);
    } finally {
      setLoading(false);
    }
  };

  const requests = reportData?.requests || [];
  const totalApprovedDays = reportData?.totalApprovedDays || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/60">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.periodStart}
            onChange={(e) => setFilters({ ...filters, periodStart: e.target.value })}
            className="rounded-2xl border border-stone-200 px-3.5 py-2 text-xs bg-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">End Date</label>
          <input
            type="date"
            value={filters.periodEnd}
            onChange={(e) => setFilters({ ...filters, periodEnd: e.target.value })}
            className="rounded-2xl border border-stone-200 px-3.5 py-2 text-xs bg-white focus:outline-none"
          />
        </div>
        <div className="flex items-end self-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary rounded-full px-5 py-2 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Generate Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-500 text-stone-950 rounded-[24px] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-950/70">Total Approved Leave Days</p>
          <p className="text-3xl font-black mt-1">{totalApprovedDays} Days</p>
        </div>
        <div className="bg-stone-900 text-white rounded-[24px] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Leave Requests</p>
          <p className="text-3xl font-black mt-1 text-amber-400">{requests.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-xs font-medium">
          No leave request records found.
        </div>
      ) : (
        <div className="overflow-hidden border border-stone-200/80 rounded-2xl bg-white">
          <table className="min-w-full divide-y divide-stone-200/60">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Leave Type</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Dates</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-stone-500">Duration</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-stone-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                    {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-600">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: `${r.timeOffType?.color || '#6366f1'}18`, color: r.timeOffType?.color || '#4f46e5' }}
                    >
                      {r.timeOffType?.name || 'Leave'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-600">
                    {formatDate(r.startDate)} - {formatDate(r.endDate)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-center font-bold text-stone-900">{r.duration} Days</td>
                  <td className="px-4 py-3.5 text-xs text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
