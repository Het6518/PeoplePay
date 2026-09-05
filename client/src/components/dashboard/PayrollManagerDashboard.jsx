import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Plus,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { dashboardApi } from '../../services/apiServices';
import { formatINR } from '../../utils/formatters';
import { StatusBadge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function PayrollManagerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchManagerData = async () => {
    setLoading(true);
    try {
      const [res, deptRes] = await Promise.all([
        dashboardApi.getPayrollManagerDashboard(),
        dashboardApi.getSalaryByDepartment({}),
      ]);

      setData(res.data || res);
      setDeptData(deptRes.data || deptRes || []);
    } catch (err) {
      console.error('Failed to fetch payroll manager dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  const kpis = data?.kpis || {};
  const pipeline = data?.payrunPipeline || { DRAFT: [], COMPUTED: [], VALIDATED: [], PAID: [] };
  const pendingActions = (data?.pendingActionsQueue || []).slice(0, 3);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-950 tracking-tight">
            Payroll Operations & Governance
          </h1>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/payroll/payruns/new')}
            className="px-4 py-2.5 rounded-full bg-stone-950 hover:bg-stone-800 text-white font-extrabold text-xs transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus size={16} /> New Payrun
          </button>
          <button
            onClick={() => navigate('/payroll/salary-rules/new')}
            className="px-3.5 py-2.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300/80 font-extrabold text-xs transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> New Rule
          </button>
        </div>
      </div>

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
            Net Paid Out
          </span>
          <span className="text-2xl font-black text-stone-950 font-mono mt-1 block tracking-tight">
            {formatINR(kpis.totalNetPaid)}
          </span>
        </div>

        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
            Payslips Generated
          </span>
          <span className="text-2xl font-black text-stone-950 font-mono mt-1 block tracking-tight">
            {kpis.payslipsGenerated || 0}
          </span>
        </div>

        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
            Average Salary
          </span>
          <span className="text-2xl font-black text-stone-950 font-mono mt-1 block tracking-tight">
            {formatINR(kpis.averageSalary)}
          </span>
        </div>

        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
            Approved Leave Days
          </span>
          <span className="text-2xl font-black text-amber-600 font-mono mt-1 block tracking-tight">
            {kpis.approvedTimeOffDays || 0} Days
          </span>
        </div>

        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
            Attendance Health
          </span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block tracking-tight">
            {kpis.attendanceHealth || 0}%
          </span>
        </div>
      </div>

      {/* Payrun Processing Pipeline */}
      <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-700 flex items-center justify-center font-extrabold">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-950 uppercase tracking-wider">
                Payrun Processing Pipeline
              </h3>
            </div>
          </div>
          <button
            onClick={() => navigate('/payroll/payruns')}
            className="text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 px-4 py-2 rounded-full shadow-xs transition-all flex items-center gap-1.5"
          >
            All Payruns <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID'].map((status) => {
            const list = pipeline[status] || [];
            return (
              <div key={status} className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/80 flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between mb-3">
                  <StatusBadge status={status} />
                  <span className="text-xs font-mono font-bold text-stone-500">
                    {list.length} Batch(es)
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {list.slice(0, 3).map((pr) => (
                    <div
                      key={pr.id}
                      onClick={() => navigate(`/payroll/payruns/${pr.id}`)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        pr.isStuck
                          ? 'bg-rose-50/90 border-rose-300 hover:border-rose-400'
                          : 'bg-white border-stone-200/80 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-extrabold text-stone-950">
                        <span className="truncate max-w-[140px]">{pr.name}</span>
                        {pr.isStuck && (
                          <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full border border-rose-200">
                            Stuck &gt;3d
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-stone-500 mt-1 flex justify-between">
                        <span>{pr.employeeCount} Emps</span>
                        <span className="font-bold text-stone-950">{formatINR(pr.totalNet)}</span>
                      </div>
                    </div>
                  ))}

                  {list.length === 0 && (
                    <p className="text-xs text-stone-400 italic py-4 text-center font-medium">
                      No payruns in {status}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Balanced 2-Column Row: Department Salary Cost & Sized Payslip Warnings Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Department Salary Cost Bar Chart */}
        <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
            <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
              Salary Cost by Department
            </h3>
            <span className="text-xs font-bold text-stone-400 font-mono">Live Department Totals</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="departmentName" stroke="#78716c" fontSize={11} />
                <YAxis stroke="#78716c" fontSize={11} />
                <Tooltip formatter={(val) => formatINR(val)} />
                <Bar dataKey="totalNet" fill="#FACC15" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payslip Warnings Queue */}
        <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                Payslip Warnings Queue
              </h3>
            </div>
            <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/60">
              {(data?.pendingActionsQueue || []).length} Items
            </span>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {pendingActions.map((ps) => (
              <div
                key={ps.id}
                onClick={() => navigate(`/payroll/payslips/${ps.id}`)}
                className="p-3.5 rounded-2xl border border-amber-200/70 bg-amber-50/40 hover:bg-amber-100/40 cursor-pointer transition-all text-xs"
              >
                <div className="flex justify-between font-extrabold text-stone-950">
                  <span>{ps.employee?.firstName} {ps.employee?.lastName}</span>
                  <span className="text-amber-800 font-mono text-[11px] font-bold">Warning</span>
                </div>
                <p className="text-stone-600 mt-1 text-[11px] font-medium">
                  Payrun: {ps.payrun?.name}
                </p>
              </div>
            ))}

            {pendingActions.length === 0 && (
              <p className="text-xs text-emerald-800 font-bold bg-emerald-50/80 p-6 rounded-2xl border border-emerald-200 text-center">
                All payslip warnings cleared!
              </p>
            )}
          </div>

          {(data?.pendingActionsQueue || []).length > 3 && (
            <div className="pt-3 border-t border-stone-100 text-right">
              <button
                onClick={() => navigate('/payroll/payruns')}
                className="text-xs font-extrabold text-stone-900 hover:text-amber-600 inline-flex items-center gap-1 transition-colors"
              >
                View all {(data?.pendingActionsQueue || []).length} warnings <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
