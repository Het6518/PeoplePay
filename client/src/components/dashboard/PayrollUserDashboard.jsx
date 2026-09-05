import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  AlertTriangle,
  Flag,
  BookOpen,
  Search,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { dashboardApi } from '../../services/apiServices';
import { formatINR } from '../../utils/formatters';
import { StatusBadge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

export function PayrollUserDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchStructure, setSearchStructure] = useState('');
  const [flaggingId, setFlaggingId] = useState(null);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getPayrollUserDashboard();
      setData(res.data || res);
    } catch (err) {
      console.error('Failed to fetch payroll user dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleFlagForManager = async (payslipId) => {
    setFlaggingId(payslipId);
    try {
      await dashboardApi.flagWarning({
        payslipId,
        note: 'Flagged by Payroll User for Payroll Manager review.',
      });
      toast.success('Payslip flagged for Payroll Manager review.');
      await fetchUserData();
    } catch (err) {
      toast.error('Failed to flag payslip warning.');
    } finally {
      setFlaggingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  const kpis = data?.kpis || {};
  const inProgressPayruns = data?.inProgressPayruns || [];
  const payslipWarnings = data?.payslipWarnings || [];
  const salaryStructures = data?.salaryStructures || [];
  const attendanceSnapshot = data?.attendanceSnapshot || {};

  const filteredStructures = salaryStructures.filter((s) =>
    s.name.toLowerCase().includes(searchStructure.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-950 tracking-tight">
            My Payroll Execution Workspace
          </h1>
        </div>

        <button
          onClick={() => navigate('/payroll/payruns/new')}
          className="px-4 py-2.5 rounded-full bg-stone-950 hover:bg-stone-800 text-white font-extrabold text-xs transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> New Payrun
        </button>
      </div>

      {/* Outcome-Only KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
            Total Net Paid
          </span>
          <span className="text-3xl font-black text-stone-950 font-mono mt-1 block tracking-tight">
            {formatINR(kpis.totalNetPaid)}
          </span>
        </div>

        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
            Payslips Processed
          </span>
          <span className="text-3xl font-black text-stone-950 font-mono mt-1 block tracking-tight">
            {kpis.payslipsProcessed || 0}
          </span>
        </div>

        <div className="bg-white/95 rounded-[24px] p-5 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">
            Attendance Health
          </span>
          <span className="text-3xl font-black text-emerald-600 font-mono mt-1 block tracking-tight">
            {kpis.attendanceHealth || 0}%
          </span>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: In-Progress Payruns & Warnings */}
        <div className="lg:col-span-8 space-y-6">

          {/* My In-Progress Payruns Widget */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="text-stone-950" size={20} />
                <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                  In-Progress Payruns
                </h3>
              </div>
              <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                {inProgressPayruns.length} Active Batches
              </span>
            </div>

            <div className="space-y-3">
              {inProgressPayruns.map((pr) => (
                <div
                  key={pr.id}
                  className="p-4 rounded-2xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-stone-950">{pr.name}</h4>
                      <StatusBadge status={pr.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 font-mono">
                      <span>Structure: {pr.salaryStructure?.name}</span>
                      <span>• {pr._count?.payslips || 0} Employees</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/payroll/payruns/${pr.id}`)}
                    className="px-4 py-2 rounded-full bg-stone-950 hover:bg-stone-800 text-white font-extrabold text-xs transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-center shrink-0"
                  >
                    Continue Processing <ChevronRight size={14} />
                  </button>
                </div>
              ))}

              {inProgressPayruns.length === 0 && (
                <div className="p-8 rounded-2xl bg-stone-50/80 border border-dashed border-stone-200 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-sm font-black text-stone-950">No Payruns In Progress</h4>
                  <p className="text-xs font-medium text-stone-500 mt-1">
                    All payruns have been validated or finalized. Start a new payrun using the button above.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payslip Warnings Needing Attention with Flag for Manager */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                  Payslip Warnings Needing Attention
                </h3>
              </div>
              <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                {payslipWarnings.length} Warnings
              </span>
            </div>

            <div className="space-y-3">
              {payslipWarnings.map((ps) => (
                <div
                  key={ps.id}
                  className="p-4 rounded-2xl border border-amber-200/70 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-sm font-extrabold text-stone-950">
                      {ps.employee?.firstName} {ps.employee?.lastName}{' '}
                      <span className="font-mono text-xs text-stone-400">({ps.employee?.employeeCode})</span>
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5 font-medium">
                      Payrun: <span className="font-bold text-stone-950">{ps.payrun?.name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <button
                      onClick={() => navigate(`/payroll/payslips/${ps.id}`)}
                      className="px-3.5 py-1.5 rounded-full bg-stone-100 text-stone-800 text-xs font-bold hover:bg-stone-200 transition-colors"
                    >
                      View Detail
                    </button>
                    <button
                      onClick={() => handleFlagForManager(ps.id)}
                      disabled={flaggingId === ps.id}
                      className="px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-extrabold transition-colors flex items-center gap-1"
                    >
                      <Flag size={12} />
                      Flag for Manager
                    </button>
                  </div>
                </div>
              ))}

              {payslipWarnings.length === 0 && (
                <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <h4 className="text-xs font-black text-emerald-950">Zero Warnings Pending</h4>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: READ-ONLY Salary Structures Reference Panel */}
        <div className="lg:col-span-4 space-y-6">

          {/* READ-ONLY Structure Reference Panel */}
          <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="text-stone-950" size={20} />
                <h3 className="text-xs font-black text-stone-950 uppercase tracking-wider">
                  Salary Structures Reference
                </h3>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-300">
                Read-Only
              </span>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-stone-400" size={14} />
              <input
                type="text"
                placeholder="Filter structures..."
                value={searchStructure}
                onChange={(e) => setSearchStructure(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200/80 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Structure List (STRICTLY NO EDIT/CREATE/DELETE BUTTONS) */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {filteredStructures.map((struct) => (
                <div
                  key={struct.id}
                  className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/80 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center font-extrabold text-stone-950">
                    <span>{struct.name}</span>
                    <span className="text-[10px] font-mono bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                      {struct.rules?.length || 0} Rules
                    </span>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-stone-200/60">
                    {struct.rules?.map((rule) => (
                      <div key={rule.id} className="flex justify-between text-[11px] text-stone-600">
                        <span className="font-mono text-stone-950 font-extrabold">{rule.code}</span>
                        <span className="font-medium">{rule.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredStructures.length === 0 && (
                <p className="text-xs text-stone-400 italic py-4 text-center">
                  No matching salary structures found.
                </p>
              )}
            </div>
          </div>

          {/* Attendance & Leave Snapshot */}
          <div className="bg-stone-950 text-white rounded-[28px] p-6 border border-stone-800 shadow-xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-300">
              Attendance & Leave Snapshot
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div>
                <span className="text-stone-400 block font-medium text-[11px]">Present Today</span>
                <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                  {attendanceSnapshot.presentToday || 0} / {attendanceSnapshot.totalEmployees || 0}
                </span>
              </div>

              <div>
                <span className="text-stone-400 block font-medium text-[11px]">Pending Leaves</span>
                <span className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                  {attendanceSnapshot.pendingLeaves || 0}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
