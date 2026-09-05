import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Clock, Calendar } from 'lucide-react';
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
      // fetch existing schedule details if applicable
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
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    
    const netMinutes = totalMinutes - (Number(day.breakMinutes) || 0);
    return netMinutes > 0 ? (netMinutes / 60).toFixed(2) : 0;
  };

  const totalWeeklyHours = days.reduce((acc, day) => acc + Number(calculateDailyHours(day)), 0).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        type: 'FIXED',
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/schedules')} className="p-2 rounded-full bg-stone-200/60 hover:bg-stone-300 text-stone-700 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">{isEdit ? 'Edit Schedule' : 'New Schedule'}</h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5">Define weekly work hours, shift times, and break durations</p>
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Schedule Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard 40h Work Week"
              className="w-full max-w-md rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
            <table className="min-w-full divide-y divide-stone-200/60">
              <thead className="bg-stone-50/80">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Day</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Workday</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Start Time</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">End Time</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Break (min)</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Daily Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {days.map((day, idx) => (
                  <tr key={day.id} className={day.isWorkday ? 'bg-white' : 'bg-stone-50/40'}>
                    <td className="px-4 py-3.5 text-sm font-semibold text-stone-900">{day.name}</td>
                    <td className="px-4 py-3.5">
                      <input 
                        type="checkbox" 
                        checked={day.isWorkday}
                        onChange={(e) => handleDayChange(idx, 'isWorkday', e.target.checked)}
                        className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 border-stone-300"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <input 
                        type="time" 
                        disabled={!day.isWorkday}
                        value={day.startTime}
                        onChange={(e) => handleDayChange(idx, 'startTime', e.target.value)}
                        className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs bg-stone-50/50 disabled:opacity-40 focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <input 
                        type="time" 
                        disabled={!day.isWorkday}
                        value={day.endTime}
                        onChange={(e) => handleDayChange(idx, 'endTime', e.target.value)}
                        className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs bg-stone-50/50 disabled:opacity-40 focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <input 
                        type="number" 
                        min="0"
                        disabled={!day.isWorkday}
                        value={day.breakMinutes}
                        onChange={(e) => handleDayChange(idx, 'breakMinutes', e.target.value)}
                        className="w-20 rounded-xl border border-stone-200 px-3 py-1.5 text-xs bg-stone-50/50 disabled:opacity-40 focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-bold text-stone-800">
                      {calculateDailyHours(day)}h
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-stone-900 text-white">
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-300">Total Weekly Hours:</td>
                  <td className="px-6 py-4 text-right font-black text-lg text-amber-400">{totalWeeklyHours}h</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit"
              className="btn-primary rounded-full px-6 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
