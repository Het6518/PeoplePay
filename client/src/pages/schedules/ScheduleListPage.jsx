import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, AlertCircle, AlertTriangle, Users, CheckCircle2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleApi } from '../../services/apiServices';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export default function ScheduleListPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  
  // Deletion modal states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [blockedTarget, setBlockedTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await scheduleApi.getAll();
      setSchedules(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDelete = (schedule) => {
    const empCount = schedule._count?.employees ?? schedule.employeeCount ?? 0;
    if (empCount > 0) {
      setBlockedTarget(schedule);
    } else {
      setDeleteTarget(schedule);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await scheduleApi.delete(deleteTarget.id);
      toast.success(`Schedule "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      await fetchSchedules();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete schedule';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Work Schedules</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">Configure company workdays and weekly shift hours</p>
        </div>

        <Link 
          to="/schedules/new"
          className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Schedule
        </Link>
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200/60">
              <thead className="bg-stone-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Weekly Hours</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Day Credit & Late Policy</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employees</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {schedules.slice((page - 1) * 10, page * 10).map((schedule) => {
                  const empCount = schedule._count?.employees ?? schedule.employeeCount ?? 0;
                  const hasEmployees = empCount > 0;

                  return (
                    <tr key={schedule.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-900">{schedule.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">
                        <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-800 font-semibold">{schedule.type || 'FIXED'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-amber-600">{schedule.weeklyHours || 40}h / week</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-stone-600">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-stone-800">
                            Full: {schedule.minHoursForFullDay ?? 7}h • Half: {schedule.minHoursForHalfDay ?? 4}h
                          </span>
                          <span className="text-[11px] text-stone-500">
                            Grace: {schedule.lateGraceMinutes ?? 15}m ({schedule.monthlyLateGraceCount ?? 3}x/mo) • OT: {schedule.overtimeMultiplier ?? 1.5}x
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                          hasEmployees ? 'bg-blue-50 text-blue-700' : 'bg-stone-100 text-stone-500'
                        }`}>
                          <Users size={13} className={hasEmployees ? 'text-blue-500' : 'text-stone-400'} />
                          {empCount} assigned
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link 
                            to={`/schedules/${schedule.id}/edit`} 
                            title="Edit Schedule"
                            className="p-1.5 rounded-full bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-800 transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleOpenDelete(schedule)} 
                            title={hasEmployees ? `Cannot delete: ${empCount} employees assigned` : "Delete Schedule"}
                            className={`p-1.5 rounded-full transition-all ${
                              hasEmployees 
                                ? 'bg-stone-100 text-stone-400 hover:bg-amber-50 hover:text-amber-700' 
                                : 'bg-stone-100 text-stone-700 hover:bg-rose-100 hover:text-rose-700'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {schedules.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-xs font-medium text-stone-400">
                      No schedules found. Click "New Schedule" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {schedules.length > 10 && (
          <div className="p-4 border-t border-stone-100">
            <Pagination
              page={page}
              totalPages={Math.ceil(schedules.length / 10)}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Confirmation Modal for Eligible Deletion */}
      <Modal 
        open={Boolean(deleteTarget)} 
        onClose={() => !deleting && setDeleteTarget(null)} 
        title="Delete Work Schedule" 
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200/70">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900">Permanent Deletion</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Are you sure you want to delete <span className="font-bold">"{deleteTarget?.name}"</span>? This will permanently remove this shift configuration and its weekday hour definitions.
              </p>
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/60 text-xs text-stone-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-500">Schedule Type:</span>
              <span className="font-semibold text-stone-800">{deleteTarget?.type || 'FIXED'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Weekly Hours:</span>
              <span className="font-semibold text-stone-800">{deleteTarget?.weeklyHours || 40}h / week</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Assigned Employees:</span>
              <span className="font-semibold text-emerald-600">0 employees</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              loading={deleting}
              disabled={deleting}
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Schedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Blocked Modal When Schedule Has Active Employees */}
      <Modal 
        open={Boolean(blockedTarget)} 
        onClose={() => setBlockedTarget(null)} 
        title="Schedule Cannot Be Deleted" 
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-950">Active Employee Assignment Detected</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                The schedule <span className="font-bold text-amber-950">"{blockedTarget?.name}"</span> cannot be deleted because it is currently assigned to{' '}
                <span className="font-bold text-amber-950">
                  {blockedTarget?._count?.employees ?? blockedTarget?.employeeCount ?? 0} employee(s)
                </span>.
              </p>
            </div>
          </div>

          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 text-xs space-y-2.5">
            <h5 className="font-bold text-stone-800 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-stone-500" />
              Why is deletion restricted?
            </h5>
            <p className="text-stone-600 leading-relaxed">
              Deleting an active schedule would break attendance punch calculations, biometric tracking, shift validations, and payroll processing for assigned staff.
            </p>
            <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-700">
              <span className="font-semibold text-stone-900">How to delete:</span>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-stone-600">
                <li>Go to the <Link to="/people" className="text-amber-700 underline font-medium">Employees (People)</Link> page.</li>
                <li>Reassign all employees on this schedule to another working schedule.</li>
                <li>Return here to safely delete this schedule once the count reaches 0.</li>
              </ol>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => setBlockedTarget(null)}
              size="sm"
              className="bg-stone-900 text-white hover:bg-stone-800 px-5 rounded-full"
            >
              Got It
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
