import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Activity,
  DollarSign,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { dashboardApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getAdminDashboard();
      setData(res.data || res);
    } catch (err) {
      console.error('Failed to fetch admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  const kpis = data?.kpis || {};
  const roleBreakdown = kpis.usersByRole || {};
  const alerts = data?.dataIntegrityAlerts || [];
  const auditLogs = data?.auditLogs || [];
  const recentUsers = data?.recentUsers || [];
  const payrollSummary = data?.companyPayrollSummary || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-950 tracking-tight">
            System & Administration Command Center
          </h1>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
              Active Employees
            </span>
            <span className="text-3xl font-black text-stone-950 font-mono mt-1 block tracking-tight">
              {kpis.totalEmployees || 0}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-900 flex items-center justify-center font-black">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
              Active Contracts
            </span>
            <span className="text-3xl font-black text-stone-950 font-mono mt-1 block tracking-tight">
              {kpis.totalContracts || 0}
            </span>
            {kpis.expiringContracts > 0 && (
              <span className="text-xs text-amber-600 font-bold mt-0.5 block">
                {kpis.expiringContracts} expiring in 30d
              </span>
            )}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center font-black shadow-xs">
            <FileText size={22} />
          </div>
        </div>

        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
              Departments
            </span>
            <span className="text-3xl font-black text-stone-950 font-mono mt-1 block tracking-tight">
              {kpis.totalDepartments || 0}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
            <Building2 size={22} />
          </div>
        </div>

        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
              System Roles
            </span>
            <span className="text-3xl font-black text-stone-950 font-mono mt-1 block tracking-tight">
              {kpis.totalUsers || 0}
            </span>
            <span className="text-[10px] font-bold text-stone-500 block mt-0.5">
              Admin: {roleBreakdown.ADMIN || 0} | Payroll Mgr: {roleBreakdown.HR_PAYROLL_MANAGER || 0}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-950 flex items-center justify-center font-black">
            <ShieldCheck size={22} />
          </div>
        </div>
      </div>

      {/* Main Grid: Data Integrity Alerts & Company Payroll Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Data Integrity Alerts & Audit Log */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Data Integrity Alerts Box */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                  Data Integrity & Architecture Alerts
                </h3>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80">
                {alerts.length} Active Anomalies
              </span>
            </div>

            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-2xl border border-rose-200/80 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        <h4 className="text-sm font-extrabold text-stone-950">
                          {alert.title}
                        </h4>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 font-medium">
                        {alert.description}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(alert.link)}
                      className="px-4 py-2 rounded-full bg-stone-950 text-white text-xs font-extrabold hover:bg-stone-800 transition-colors self-start sm:self-center shrink-0 flex items-center gap-1 shadow-xs"
                    >
                      Resolve <ArrowUpRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-black text-emerald-950">System Integrity Clean</h4>
                <p className="text-xs font-medium text-emerald-700 mt-0.5">
                  All active employees have valid contracts and assigned salary structures.
                </p>
              </div>
            )}
          </div>

          {/* Module Activity Feed / Audit Log */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="text-stone-950" size={20} />
                <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                  System Activity & Audit Trail
                </h3>
              </div>
              <span className="text-xs font-bold text-stone-400 font-mono">Live Logs</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-black uppercase text-[10px] tracking-widest">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Action</th>
                    <th className="pb-2">Entity</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-amber-50/30">
                      <td className="py-2.5 font-mono text-stone-500">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-2.5 font-extrabold text-stone-950">
                        {log.actionType}
                      </td>
                      <td className="py-2.5 font-semibold text-stone-900">
                        {log.entityType}
                      </td>
                      <td className="py-2.5 max-w-xs truncate text-stone-600">
                        {log.description}
                      </td>
                      <td className="py-2.5 text-stone-500 font-mono">
                        {log.performedBy}
                      </td>
                    </tr>
                  ))}

                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-400 italic">
                        No audit logs recorded yet. System activity will appear here in real-time.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Company Payroll Summary & Users Table */}
        <div className="lg:col-span-4 space-y-6">

          {/* Company-Wide Payroll Summary (Read-Only) */}
          <div className="bg-stone-950 text-white rounded-[28px] p-6 border border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="text-amber-400" size={20} />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-300">
                  Company Payroll Summary
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-stone-900 px-2 py-0.5 rounded-full border border-stone-800">
                Read-Only
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                  Total Net Paid
                </span>
                <p className="text-3xl font-black font-mono text-amber-400 tracking-tight mt-1">
                  {formatINR(payrollSummary.totalNetPaid)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-800 text-xs">
                <div>
                  <span className="text-stone-400 block font-medium text-[11px]">Total Gross</span>
                  <span className="font-extrabold font-mono text-white">
                    {formatINR(payrollSummary.totalGross)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block font-medium text-[11px]">Total Deductions</span>
                  <span className="font-extrabold font-mono text-rose-400">
                    {formatINR(payrollSummary.totalDeductions)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Users & Role Breakdown */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-stone-950" />
                <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                  User Role Distribution
                </h3>
              </div>
              <button
                onClick={() => navigate('/admin/users')}
                className="text-xs font-extrabold text-stone-900 hover:text-amber-600 flex items-center gap-1 transition-colors"
              >
                Manage <ExternalLink size={12} />
              </button>
            </div>

            <div className="space-y-2 text-xs font-medium">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50/80">
                <span className="font-extrabold text-stone-950">Admin</span>
                <span className="font-mono font-black text-amber-600">{roleBreakdown.ADMIN || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50/80">
                <span className="font-extrabold text-stone-950">HR Payroll Manager</span>
                <span className="font-mono font-black text-stone-950">{roleBreakdown.HR_PAYROLL_MANAGER || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50/80">
                <span className="font-extrabold text-stone-950">HR Payroll User</span>
                <span className="font-mono font-black text-stone-950">{roleBreakdown.HR_PAYROLL_USER || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50/80">
                <span className="font-extrabold text-stone-950">HR Manager</span>
                <span className="font-mono font-black text-stone-950">{roleBreakdown.HR_MANAGER || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50/80">
                <span className="font-extrabold text-stone-600">Employee</span>
                <span className="font-mono font-black text-stone-600">{roleBreakdown.EMPLOYEE || 0}</span>
              </div>
            </div>
          </div>

          {/* Quick Links Configuration */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Settings size={18} className="text-stone-950" />
              <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                Configuration Quick Links
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => navigate('/admin/users')}
                className="p-3 rounded-2xl border border-stone-200/80 hover:border-amber-300 hover:bg-amber-50/40 text-stone-950 transition-all text-left"
              >
                User Management
              </button>
              <button
                onClick={() => navigate('/schedules')}
                className="p-3 rounded-2xl border border-stone-200/80 hover:border-amber-300 hover:bg-amber-50/40 text-stone-950 transition-all text-left"
              >
                Working Schedules
              </button>
              <button
                onClick={() => navigate('/payroll/structures')}
                className="p-3 rounded-2xl border border-stone-200/80 hover:border-amber-300 hover:bg-amber-50/40 text-stone-950 transition-all text-left"
              >
                Salary Structures
              </button>
              <button
                onClick={() => navigate('/time-off/types')}
                className="p-3 rounded-2xl border border-stone-200/80 hover:border-amber-300 hover:bg-amber-50/40 text-stone-950 transition-all text-left"
              >
                Leave Types
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
