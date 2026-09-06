import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Clock, Award, Sliders } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleApi } from '../../services/apiServices';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

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

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('FIXED');

  // Attendance Credit & Salary Policy Settings (Managed by HR)
  const [minHoursForFullDay, setMinHoursForFullDay] = useState(7.0);
  const [minHoursForHalfDay, setMinHoursForHalfDay] = useState(4.0);
  const [lateGraceMinutes, setLateGraceMinutes] = useState(15);
  const [monthlyLateGraceCount, setMonthlyLateGraceCount] = useState(3);
  const [latePenaltyType, setLatePenaltyType] = useState('HALF_DAY');
  const [overtimeMinMinutes, setOvertimeMinMinutes] = useState(30);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);
  const [weekendOvertimeMultiplier, setWeekendOvertimeMultiplier] = useState(2.0);
  const [holidayOvertimeMultiplier, setHolidayOvertimeMultiplier] = useState(2.0);
  const [overtimeRequiresApproval, setOvertimeRequiresApproval] = useState(true);

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
      const fetchSchedule = async () => {
        try {
          const res = await scheduleApi.getById(id);
          const data = res?.data?.data || res?.data || res;
          if (data) {
            setName(data.name || '');
            setType(data.type || 'FIXED');
            setMinHoursForFullDay(data.minHoursForFullDay ?? 7.0);
            setMinHoursForHalfDay(data.minHoursForHalfDay ?? 4.0);
            setLateGraceMinutes(data.lateGraceMinutes ?? 15);
            setMonthlyLateGraceCount(data.monthlyLateGraceCount ?? 3);
            setLatePenaltyType(data.latePenaltyType || 'HALF_DAY');
            setOvertimeMinMinutes(data.overtimeMinMinutes ?? 30);
            setOvertimeMultiplier(data.overtimeMultiplier ?? 1.5);
            setWeekendOvertimeMultiplier(data.weekendOvertimeMultiplier ?? 2.0);
            setHolidayOvertimeMultiplier(data.holidayOvertimeMultiplier ?? 2.0);
            setOvertimeRequiresApproval(data.overtimeRequiresApproval ?? true);

            if (data.days && data.days.length > 0) {
              setDays(DAYS_OF_WEEK.map(d => {
                const dayNum = parseInt(d.id, 10) % 7;
                const match = data.days.find(sd => sd.dayOfWeek === dayNum);
                return {
                  ...d,
                  isWorkday: match ? match.isWorkday : false,
                  startTime: match?.startTime || '09:00',
                  endTime: match?.endTime || '17:00',
                  breakMinutes: match?.breakMinutes ?? 60
                };
              }));
            }
          }
        } catch (error) {
          console.error('Failed to load schedule', error);
          toast.error('Failed to load schedule details');
        } finally {
          setLoading(false);
        }
      };
      fetchSchedule();
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
    setSaving(true);
    try {
      const payload = {
        name,
        type,
        minHoursForFullDay: Number(minHoursForFullDay),
        minHoursForHalfDay: Number(minHoursForHalfDay),
        lateGraceMinutes: Number(lateGraceMinutes),
        monthlyLateGraceCount: Number(monthlyLateGraceCount),
        latePenaltyType,
        overtimeMinMinutes: Number(overtimeMinMinutes),
        overtimeMultiplier: Number(overtimeMultiplier),
        weekendOvertimeMultiplier: Number(weekendOvertimeMultiplier),
        holidayOvertimeMultiplier: Number(holidayOvertimeMultiplier),
        overtimeRequiresApproval: Boolean(overtimeRequiresApproval),
        days: days.map(d => ({
          dayOfWeek: parseInt(d.id, 10) % 7,
          startTime: d.isWorkday ? d.startTime : '00:00',
          endTime: d.isWorkday ? d.endTime : '00:00',
          breakMinutes: d.isWorkday ? Number(d.breakMinutes) : 0,
          isWorkday: d.isWorkday
        }))
      };

      if (isEdit) {
        await scheduleApi.update(id, payload);
        toast.success('Schedule & policy updated successfully');
      } else {
        await scheduleApi.create(payload);
        toast.success('Schedule created successfully');
      }
      navigate('/schedules');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/schedules')} className="p-2 rounded-full bg-stone-200/60 hover:bg-stone-300 text-stone-700 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">{isEdit ? 'Edit Schedule & Attendance Policy' : 'New Working Schedule'}</h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5">Define shift timings, day credit thresholds, late grace allowances, and overtime rules</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Schedule Basic Details */}
        <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Basic Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Schedule Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard 9-to-6 Shift"
                className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Schedule Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
              >
                <option value="FIXED">FIXED (Standard Regular Hours)</option>
                <option value="FLEXIBLE">FLEXIBLE (Core Flexible Hours)</option>
                <option value="SHIFT">SHIFT (Rotational / Shift Work)</option>
              </select>
            </div>
          </div>
        </div>

        {/* HR Attendance Credit & Salary Rules */}
        <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Attendance Credit & Salary Rules (HR Managed)</h2>
            </div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Payroll Integration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Full Day Min Hours */}
            <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-1.5">
              <label className="block text-xs font-bold text-stone-800">
                Full-Day Min Hours
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  step="0.1"
                  min="1"
                  max="24"
                  required
                  value={minHoursForFullDay}
                  onChange={(e) => setMinHoursForFullDay(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm bg-white font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs font-bold text-stone-500">hrs</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                Working &ge; {minHoursForFullDay}h grants <strong>1.0 full day pay</strong>.
              </p>
            </div>

            {/* Half Day Min Hours */}
            <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-1.5">
              <label className="block text-xs font-bold text-stone-800">
                Half-Day Min Hours
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="12"
                  required
                  value={minHoursForHalfDay}
                  onChange={(e) => setMinHoursForHalfDay(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm bg-white font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs font-bold text-stone-500">hrs</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                Working {minHoursForHalfDay}h to {minHoursForFullDay}h pays <strong>0.5 day</strong>; &lt; {minHoursForHalfDay}h pays <strong>0.0 days</strong> (Short Hours).
              </p>
            </div>

            {/* Late Grace Minutes */}
            <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-1.5">
              <label className="block text-xs font-bold text-stone-800">
                Daily Late Grace
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min="0"
                  max="180"
                  required
                  value={lateGraceMinutes}
                  onChange={(e) => setLateGraceMinutes(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm bg-white font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs font-bold text-stone-500">mins</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                Check-in within {lateGraceMinutes}m of shift start is marked On-Time.
              </p>
            </div>

            {/* Monthly Late Grace Count */}
            <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-1.5">
              <label className="block text-xs font-bold text-stone-800">
                Monthly Late Allowance
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min="0"
                  max="31"
                  required
                  value={monthlyLateGraceCount}
                  onChange={(e) => setMonthlyLateGraceCount(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm bg-white font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs font-bold text-stone-500">times</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                1st to {monthlyLateGraceCount} late check-ins per month are excused with <strong>100% full pay</strong>.
              </p>
            </div>

            {/* Late Penalty Beyond Grace */}
            <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-1.5">
              <label className="block text-xs font-bold text-stone-800">
                Late Penalty After Grace
              </label>
              <select
                value={latePenaltyType}
                onChange={(e) => setLatePenaltyType(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs bg-white font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="HALF_DAY">Deduct Half-Day (0.5 day pay)</option>
                <option value="FULL_DAY">Deduct Full-Day (1.0 day pay)</option>
                <option value="NONE">No Salary Deduction (Tracking Only)</option>
              </select>
              <p className="text-[11px] text-stone-500 leading-tight">
                Applied from the {Number(monthlyLateGraceCount) + 1}th late check-in onwards.
              </p>
            </div>

            {/* Overtime Min Buffer */}
            <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-1.5">
              <label className="block text-xs font-bold text-stone-800">
                Min OT Trigger Buffer
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min="0"
                  max="180"
                  required
                  value={overtimeMinMinutes}
                  onChange={(e) => setOvertimeMinMinutes(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm bg-white font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-xs font-bold text-stone-500">mins</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                Extra work must exceed {overtimeMinMinutes}m to qualify for overtime pay.
              </p>
            </div>
          </div>

          {/* Overtime Multipliers */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/70 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">Overtime Payout Multipliers</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">Weekday Multiplier</label>
                <input 
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={overtimeMultiplier}
                  onChange={(e) => setOvertimeMultiplier(e.target.value)}
                  className="w-full rounded-xl border border-purple-200 px-3 py-1.5 text-xs bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">Weekend Multiplier</label>
                <input 
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={weekendOvertimeMultiplier}
                  onChange={(e) => setWeekendOvertimeMultiplier(e.target.value)}
                  className="w-full rounded-xl border border-purple-200 px-3 py-1.5 text-xs bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">Holiday Multiplier</label>
                <input 
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={holidayOvertimeMultiplier}
                  onChange={(e) => setHolidayOvertimeMultiplier(e.target.value)}
                  className="w-full rounded-xl border border-purple-200 px-3 py-1.5 text-xs bg-white font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Shift Day Table */}
        <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Weekly Shift Schedule</h2>
            <span className="text-xs font-bold text-stone-500">Check workdays and specify shift times</span>
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
                  <td colSpan="5" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-300">Total Standard Weekly Hours:</td>
                  <td className="px-6 py-4 text-right font-black text-lg text-amber-400">{totalWeeklyHours}h</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button 
            type="button"
            onClick={() => navigate('/schedules')}
            className="rounded-full px-5 py-2.5 text-xs font-bold border border-stone-300 text-stone-700 hover:bg-stone-100 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={saving}
            className="btn-primary rounded-full px-6 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Schedule & Policy'}
          </button>
        </div>
      </form>
    </div>
  );
}
