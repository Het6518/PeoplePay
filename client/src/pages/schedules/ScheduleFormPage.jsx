import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleApi } from '../../services/apiServices';

const DAYS_OF_WEEK = [
  { id: '1', name: 'Monday' },
  { id: '2', name: 'Tuesday' },
  { id: '3', name: 'Wednesday' },
  { id: '4', name: 'Thursday' },
  { id: '5', name: 'Friday' },
  { id: '6', name: 'Saturday' },
  { id: '7', name: 'Sunday' }
];

export default function ScheduleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [days, setDays] = useState(
    DAYS_OF_WEEK.map(d => ({
      ...d,
      isWorkday: ['1', '2', '3', '4', '5'].includes(d.id),
      startTime: '09:00',
      endTime: '17:00',
      breakMinutes: 60
    }))
  );

  useEffect(() => {
    if (isEdit) {
      // fetch existing schedule details
      // scheduleApi.getById(id).then(...)
    }
  }, [id, isEdit]);

  const handleDayChange = (index, field, value) => {
    const newDays = [...days];
    newDays[index][field] = value;
    setDays(newDays);
  };

  const calculateDailyHours = (day) => {
    if (!day.isWorkday || !day.startTime || !day.endTime) return 0;
    
    const [startH, startM] = day.startTime.split(':').map(Number);
    const [endH, endM] = day.endTime.split(':').map(Number);
    
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // handle overnight
    
    const netMinutes = totalMinutes - (Number(day.breakMinutes) || 0);
    return netMinutes > 0 ? (netMinutes / 60).toFixed(2) : 0;
  };

  const totalWeeklyHours = days.reduce((acc, day) => acc + Number(calculateDailyHours(day)), 0).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        type: 'FIXED', // Adding default type as required by backend if not handled
        days: days.filter(d => d.isWorkday).map(d => ({
          dayOfWeek: parseInt(d.id, 10) % 7,
          startTime: d.startTime,
          endTime: d.endTime,
          breakMinutes: Number(d.breakMinutes),
          isWorkday: d.isWorkday
        }))
      };

      if (isEdit) {
        await scheduleApi.update(id, payload);
        toast.success('Schedule updated');
      } else {
        await scheduleApi.create(payload);
        toast.success('Schedule created');
      }
      navigate('/schedules');
    } catch (err) {
      toast.error('Failed to save schedule');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate('/schedules')} className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Schedule' : 'New Schedule'}</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard 40h Week"
              className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workday</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Break (min)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {days.map((day, idx) => (
                  <tr key={day.id} className={day.isWorkday ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{day.name}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        checked={day.isWorkday}
                        onChange={(e) => handleDayChange(idx, 'isWorkday', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="time" 
                        disabled={!day.isWorkday}
                        value={day.startTime}
                        onChange={(e) => handleDayChange(idx, 'startTime', e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="time" 
                        disabled={!day.isWorkday}
                        value={day.endTime}
                        onChange={(e) => handleDayChange(idx, 'endTime', e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number" 
                        min="0"
                        disabled={!day.isWorkday}
                        value={day.breakMinutes}
                        onChange={(e) => handleDayChange(idx, 'breakMinutes', e.target.value)}
                        className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">
                      {calculateDailyHours(day)}h
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="5" className="px-4 py-4 text-right font-medium text-gray-700">Total Weekly Hours:</td>
                  <td className="px-4 py-4 font-bold text-lg text-indigo-600">{totalWeeklyHours}h</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" /> Save Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
