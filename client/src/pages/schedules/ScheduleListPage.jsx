import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Eye, Trash2, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleApi } from '../../services/apiServices';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';

export default function ScheduleListPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      toast.success('Schedule deleted');
      fetchSchedules();
    } catch (err) {
      toast.error('Failed to delete schedule');
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
                {schedules.slice((page - 1) * 10, page * 10).map((schedule) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">{schedule._count?.employees ?? schedule.employeeCount ?? 0} assigned</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link to={`/schedules/${schedule.id}/edit`} className="p-1.5 rounded-full bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-800 transition-all">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(schedule.id)} className="p-1.5 rounded-full bg-stone-100 text-stone-700 hover:bg-rose-100 hover:text-rose-700 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-xs font-medium text-stone-400">
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
    </div>
  );
}
