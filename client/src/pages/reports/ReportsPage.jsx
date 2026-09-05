import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, RefreshCw, BarChart2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { reportApi, departmentApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('payroll');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Generate comprehensive operational and financial reports</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'payroll', label: 'Payroll Report' },
              { id: 'attendance', label: 'Attendance Report' },
              { id: 'timeoff', label: 'Time Off Report' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'payroll' && <PayrollReport />}
          {activeTab === 'attendance' && <AttendanceReport />}
          {activeTab === 'timeoff' && <TimeOffReport />}
        </div>
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
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Period Start</label>
          <input
            type="date"
            value={filters.periodStart}
            onChange={(e) => setFilters({ ...filters, periodStart: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Period End</label>
          <input
            type="date"
            value={filters.periodEnd}
            onChange={(e) => setFilters({ ...filters, periodEnd: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
          <select
            value={filters.departmentId}
            onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 min-w-[160px]"
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
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Filter className="w-4 h-4 mr-2" />}
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : payslips.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No payroll records found for the selected parameters.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Payrun / Period</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Gross Salary</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Deductions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Net Salary</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {payslips.map((ps) => (
                <tr key={ps.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {ps.employee ? `${ps.employee.firstName} ${ps.employee.lastName}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {ps.employee?.department?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{ps.payrun?.name}</div>
                    <div className="text-xs text-slate-400">{formatDate(ps.periodStart)} - {formatDate(ps.periodEnd)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 text-right">{formatINR(ps.grossSalary)}</td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">{formatINR(ps.totalDeductions)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-right">{formatINR(ps.netSalary)}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td colSpan="3" className="px-4 py-3.5 text-sm text-slate-900 text-right">Totals ({totals.count} record{totals.count !== 1 ? 's' : ''}):</td>
                <td className="px-4 py-3.5 text-sm text-slate-900 text-right">{formatINR(totals.gross)}</td>
                <td className="px-4 py-3.5 text-sm text-red-600 text-right">{formatINR(totals.deductions)}</td>
                <td className="px-4 py-3.5 text-sm text-emerald-700 text-right">{formatINR(totals.net)}</td>
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
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.periodStart}
            onChange={(e) => setFilters({ ...filters, periodStart: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
          <input
            type="date"
            value={filters.periodEnd}
            onChange={(e) => setFilters({ ...filters, periodEnd: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-end self-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Filter className="w-4 h-4 mr-2" />}
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : summary.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No attendance summary records found for the selected date range.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Department</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Present</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Late</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Absent</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Overtime</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Worked Hours</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {summary.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {row.employee?.department?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-emerald-600 font-medium">{row.present || 0}</td>
                  <td className="px-4 py-3 text-sm text-center text-amber-600 font-medium">{row.late || 0}</td>
                  <td className="px-4 py-3 text-sm text-center text-rose-600 font-medium">{row.absent || 0}</td>
                  <td className="px-4 py-3 text-sm text-center text-purple-600 font-medium">{row.overtime || 0}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold">
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
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.periodStart}
            onChange={(e) => setFilters({ ...filters, periodStart: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
          <input
            type="date"
            value={filters.periodEnd}
            onChange={(e) => setFilters({ ...filters, periodEnd: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-end self-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Filter className="w-4 h-4 mr-2" />}
            Generate Report
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex-1">
          <p className="text-xs font-medium text-emerald-700">Total Approved Leave Days</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{totalApprovedDays} Days</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex-1">
          <p className="text-xs font-medium text-indigo-700">Total Leave Requests</p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{requests.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No leave request records found.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Leave Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Dates</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Duration</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${r.timeOffType?.color || '#6366f1'}20`, color: r.timeOffType?.color || '#6366f1' }}
                    >
                      {r.timeOffType?.name || 'Leave'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDate(r.startDate)} - {formatDate(r.endDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-slate-900">{r.duration} Days</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
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
