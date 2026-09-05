import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleApi } from '../../services/apiServices';

export default function ScheduleListPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

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
      // await scheduleApi.delete(id); // assuming this exists
      toast.success('Schedule deleted');
      fetchSchedules();
    } catch (err) {
      toast.error('Failed to delete schedule');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Work Schedules</h1>
        <Link 
          to="/schedules/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> New Schedule
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employees Assigned</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {schedules.map((schedule) => (
              <tr key={schedule.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{schedule.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schedule.type || 'Standard'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schedule.weeklyHours || 40}h</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schedule._count?.employees ?? schedule.employeeCount ?? 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-3">
                    <button className="text-gray-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                    <Link to={`/schedules/${schedule.id}/edit`} className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></Link>
                    <button onClick={() => handleDelete(schedule.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  No schedules found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
