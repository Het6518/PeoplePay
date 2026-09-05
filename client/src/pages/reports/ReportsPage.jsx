import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, RefreshCw, FileSpreadsheet, FileText, CheckCircle2, Clock, XCircle, Users } from 'lucide-react';
import { reportApi, departmentApi, timeOffApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { exportToCSV } from '../../utils/csvExporter';
import { exportToPDF } from '../../utils/pdfExporter';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('payroll');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Reports & Export Center</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">
            Generate, filter, and export comprehensive Payroll, Attendance, and Time Off reports to CSV or PDF.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="bg-stone-200/70 p-1.5 rounded-full inline-flex border border-stone-300/50 shadow-inner">
          {[
            { id: 'payroll', label: 'Payroll Summary' },
            { id: 'attendance', label: 'Attendance & Shift Audit' },
            { id: 'timeoff', label: 'Time Off & Leave Summary' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-stone-950 text-white shadow-md'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-300/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white/95 rounded-[28px] border border-stone-200/80 shadow-soft p-6">
        {activeTab === 'payroll' && <PayrollReport />}
        {activeTab === 'attendance' && <AttendanceReport />}
        {activeTab === 'timeoff' && <TimeOffReport />}
      </div>
    </div>
  );
}

// ============================================================
// PAYROLL REPORT COMPONENT
// ============================================================
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
    departmentApi
      .getAll()
      .then((res) => setDepartments(Array.isArray(res.data || res) ? res.data || res : []))
      .catch(console.error);
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getPayroll(filters);
      setReportData(res.data || res);
    } catch (err) {
      toast.error('Failed to load payroll report');
    } finally {
      setLoading(false);
    }
  };

  const payslips = reportData?.payslips || [];
  const totals = reportData?.totals || { gross: 0, deductions: 0, net: 0, count: 0 };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      { label: 'Employee Code', key: 'code', accessor: (r) => r.employee?.employeeCode || '-' },
      { label: 'Employee Name', key: 'name', accessor: (r) => `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() },
      { label: 'Department', key: 'department', accessor: (r) => r.employee?.department?.name || '-' },
      { label: 'Payrun Name', key: 'payrun', accessor: (r) => r.payrun?.name || '-' },
      { label: 'Period Start', key: 'periodStart', accessor: (r) => formatDate(r.periodStart) },
      { label: 'Period End', key: 'periodEnd', accessor: (r) => formatDate(r.periodEnd) },
      { label: 'Gross Salary (₹)', key: 'grossSalary', accessor: (r) => r.grossSalary },
      { label: 'Deductions (₹)', key: 'totalDeductions', accessor: (r) => r.totalDeductions },
      { label: 'Net Salary (₹)', key: 'netSalary', accessor: (r) => r.netSalary },
      { label: 'Status', key: 'status' },
    ];
    exportToCSV('Payroll_Summary_Report', headers, payslips);
    toast.success('Exported Payroll Report to CSV!');
  };

  // PDF Export
  const handleExportPDF = () => {
    const headers = [
      { label: 'Employee', accessor: (r) => `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() },
      { label: 'Department', accessor: (r) => r.employee?.department?.name || '-' },
      { label: 'Payrun / Period', accessor: (r) => `${r.payrun?.name || '-'} (${formatDate(r.periodStart)})` },
      { label: 'Gross Salary', align: 'right', accessor: (r) => formatINR(r.grossSalary) },
      { label: 'Deductions', align: 'right', accessor: (r) => formatINR(r.totalDeductions) },
      { label: 'Net Salary', align: 'right', accessor: (r) => formatINR(r.netSalary) },
    ];
    const cards = [
      { label: 'Total Payslips', value: totals.count },
      { label: 'Total Gross Disbursement', value: formatINR(totals.gross) },
      { label: 'Total Statutory Deductions', value: formatINR(totals.deductions) },
      { label: 'Total Net Salary Paid', value: formatINR(totals.net) },
    ];
    exportToPDF('Payroll Summary & Disbursement Report', 'Comprehensive audit of employee wages and net disbursements', headers, payslips, cards);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">
              Period Start
            </label>
            <input
              type="date"
              value={filters.periodStart}
              onChange={(e) => setFilters({ ...filters, periodStart: e.target.value })}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">
              Period End
            </label>
            <input
              type="date"
              value={filters.periodEnd}
              onChange={(e) => setFilters({ ...filters, periodEnd: e.target.value })}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">
              Department
            </label>
            <select
              value={filters.departmentId}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold bg-white focus:outline-none min-w-[160px]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end self-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary rounded-full px-5 py-2 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={payslips.length === 0}
            className="btn-secondary rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={payslips.length === 0}
            className="btn-primary rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Total Records</span>
          <p className="text-xl font-black text-stone-950 mt-1">{totals.count}</p>
        </div>
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Gross Amount</span>
          <p className="text-xl font-black text-stone-950 mt-1">{formatINR(totals.gross)}</p>
        </div>
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Total Deductions</span>
          <p className="text-xl font-black text-rose-600 mt-1">{formatINR(totals.deductions)}</p>
        </div>
        <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-white">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Net Salary Paid</span>
          <p className="text-xl font-black text-amber-400 mt-1">{formatINR(totals.net)}</p>
        </div>
      </div>

      {/* Report Table */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : payslips.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-xs font-medium">
          No payroll records found for the selected filter parameters.
        </div>
      ) : (
        <div className="overflow-hidden border border-stone-200/80 rounded-2xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
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
                <tr key={ps.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                    {ps.employee ? `${ps.employee.firstName} ${ps.employee.lastName}` : '-'}
                    <span className="block text-[10px] text-stone-400 font-mono">{ps.employee?.employeeCode}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-600">
                    {ps.employee?.department?.name || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-600">
                    <div>{ps.payrun?.name || 'Manual Payrun'}</div>
                    <div className="text-[11px] text-stone-400">
                      {formatDate(ps.periodStart)} - {formatDate(ps.periodEnd)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-700 text-right">{formatINR(ps.grossSalary)}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-rose-600 text-right">{formatINR(ps.totalDeductions)}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-emerald-600 text-right">{formatINR(ps.netSalary)}</td>
                </tr>
              ))}
              <tr className="bg-stone-950 text-white font-bold">
                <td colSpan="3" className="px-4 py-4 text-xs uppercase tracking-wider text-stone-300 text-right">
                  Totals ({totals.count} records):
                </td>
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

// ============================================================
// ATTENDANCE REPORT COMPONENT
// ============================================================
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
      setReportData(res.data || res);
    } catch (err) {
      toast.error('Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || [];

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      { label: 'Employee Code', key: 'code', accessor: (r) => r.employee?.employeeCode || '-' },
      { label: 'Employee Name', key: 'name', accessor: (r) => `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() },
      { label: 'Department', key: 'dept', accessor: (r) => r.employee?.department?.name || '-' },
      { label: 'Present Days', key: 'present', accessor: (r) => r.present || 0 },
      { label: 'Late Days', key: 'late', accessor: (r) => r.late || 0 },
      { label: 'Absent Days', key: 'absent', accessor: (r) => r.absent || 0 },
      { label: 'Overtime Days', key: 'overtime', accessor: (r) => r.overtime || 0 },
      { label: 'Total Worked Hours', key: 'hours', accessor: (r) => r.totalWorkedHours ? Math.round(r.totalWorkedHours * 10) / 10 : 0 },
    ];
    exportToCSV('Attendance_Audit_Report', headers, summary);
    toast.success('Exported Attendance Report to CSV!');
  };

  // PDF Export
  const handleExportPDF = () => {
    const headers = [
      { label: 'Employee', accessor: (r) => `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() },
      { label: 'Department', accessor: (r) => r.employee?.department?.name || '-' },
      { label: 'Present', align: 'center', accessor: (r) => r.present || 0 },
      { label: 'Late', align: 'center', accessor: (r) => r.late || 0 },
      { label: 'Absent', align: 'center', accessor: (r) => r.absent || 0 },
      { label: 'Worked Hours', align: 'right', accessor: (r) => `${(r.totalWorkedHours || 0).toFixed(1)} hrs` },
    ];
    const totalHours = summary.reduce((sum, s) => sum + (s.totalWorkedHours || 0), 0);
    const cards = [
      { label: 'Employees Tracked', value: summary.length },
      { label: 'Total Cumulative Hours', value: `${totalHours.toFixed(1)} hrs` },
    ];
    exportToPDF('Attendance & Shift Audit Summary', 'Shift compliance and worked hours breakdown', headers, summary, cards);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.periodStart}
              onChange={(e) => setFilters({ ...filters, periodStart: e.target.value })}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">End Date</label>
            <input
              type="date"
              value={filters.periodEnd}
              onChange={(e) => setFilters({ ...filters, periodEnd: e.target.value })}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-end self-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary rounded-full px-5 py-2 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={summary.length === 0}
            className="btn-secondary rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={summary.length === 0}
            className="btn-primary rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : summary.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-xs font-medium">
          No attendance summary records found for the selected date range.
        </div>
      ) : (
        <div className="overflow-hidden border border-stone-200/80 rounded-2xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
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
                <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
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

// ============================================================
// TIME OFF REPORT COMPONENT
// ============================================================
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
      setReportData(res.data || res);
    } catch (err) {
      toast.error('Failed to load time off report');
    } finally {
      setLoading(false);
    }
  };

  const requests = reportData?.requests || [];
  const totalApprovedDays = reportData?.totalApprovedDays || 0;

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      { label: 'Employee Code', key: 'code', accessor: (r) => r.employee?.employeeCode || '-' },
      { label: 'Employee Name', key: 'name', accessor: (r) => `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() },
      { label: 'Department', key: 'dept', accessor: (r) => r.employee?.department?.name || '-' },
      { label: 'Leave Type', key: 'type', accessor: (r) => r.timeOffType?.name || '-' },
      { label: 'Start Date', key: 'startDate', accessor: (r) => formatDate(r.startDate) },
      { label: 'End Date', key: 'endDate', accessor: (r) => formatDate(r.endDate) },
      { label: 'Duration (Days)', key: 'duration' },
      { label: 'Status', key: 'status' },
    ];
    exportToCSV('Time_Off_Leave_Report', headers, requests);
    toast.success('Exported Time Off Report to CSV!');
  };

  // PDF Export
  const handleExportPDF = () => {
    const headers = [
      { label: 'Employee', accessor: (r) => `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() },
      { label: 'Leave Type', accessor: (r) => r.timeOffType?.name || '-' },
      { label: 'Dates', accessor: (r) => `${formatDate(r.startDate)} - ${formatDate(r.endDate)}` },
      { label: 'Duration', align: 'center', accessor: (r) => `${r.duration} Days` },
      { label: 'Status', align: 'center', accessor: (r) => r.status },
    ];
    const cards = [
      { label: 'Total Requests', value: requests.length },
      { label: 'Total Approved Days', value: `${totalApprovedDays} Days` },
    ];
    exportToPDF('Time Off & Leave Summary Report', 'Audit of employee leave applications and status', headers, requests, cards);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.periodStart}
              onChange={(e) => setFilters({ ...filters, periodStart: e.target.value })}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">End Date</label>
            <input
              type="date"
              value={filters.periodEnd}
              onChange={(e) => setFilters({ ...filters, periodEnd: e.target.value })}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-end self-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary rounded-full px-5 py-2 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={requests.length === 0}
            className="btn-secondary rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={requests.length === 0}
            className="btn-primary rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-400 text-stone-950 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-stone-950/70">Total Approved Leave Days</p>
          <p className="text-2xl font-black mt-1">{totalApprovedDays} Days</p>
        </div>
        <div className="bg-stone-950 text-white rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Total Leave Requests</p>
          <p className="text-2xl font-black mt-1 text-amber-400">{requests.length}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-xs font-medium">
          No leave request records found.
        </div>
      ) : (
        <div className="overflow-hidden border border-stone-200/80 rounded-2xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
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
                <tr key={r.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                    {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-600">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold inline-block"
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
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        r.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
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
