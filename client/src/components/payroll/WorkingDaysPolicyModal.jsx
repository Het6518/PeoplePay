import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { workingDaysApi } from '../../services/apiServices';
import toast from 'react-hot-toast';
import { Calendar, Settings } from 'lucide-react';

export function WorkingDaysPolicyModal({ open, onClose, onPolicyUpdated }) {
  const [totalDays, setTotalDays] = useState(22);
  const [name, setName] = useState('Standard Monthly Policy');
  const [effectivePeriod, setEffectivePeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) {
      setFetching(true);
      workingDaysApi.getPolicy()
        .then(res => {
          const p = res.data?.data || res.data;
          if (p) {
            setTotalDays(p.totalDays || 22);
            setName(p.name || 'Standard Monthly Policy');
            setEffectivePeriod(p.effectivePeriod || '');
          }
        })
        .catch(err => {
          toast.error('Failed to load current policy settings');
        })
        .finally(() => setFetching(false));
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await workingDaysApi.updatePolicy({
        totalDays: parseInt(totalDays, 10),
        name,
        effectivePeriod: effectivePeriod || null,
      });
      toast.success('Working Days Policy updated! Draft payruns recomputed.');
      if (onPolicyUpdated) onPolicyUpdated(res.data?.data || res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Configure Working Days Policy" size="md">
      {fetching ? (
        <div className="py-8 text-center text-slate-500">Loading policy settings...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
            <Settings size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <strong>Payroll Policy Note:</strong> Changing base working days will automatically update payroll ratio calculations (`payableRatio = workedDays / totalWorkingDays`) and recompute all <code>DRAFT</code> or <code>COMPUTED</code> payruns.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Policy Name
            </label>
            <input
              type="text"
              className="form-input w-full text-sm rounded-lg border-slate-300"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard 22-Day Policy"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Base Monthly Working Days
            </label>
            <select
              className="form-select w-full text-sm rounded-lg border-slate-300"
              value={totalDays}
              onChange={(e) => setTotalDays(Number(e.target.value))}
            >
              <option value={22}>22 Days (Standard 5-day week, 4.4 weeks/mo)</option>
              <option value={21}>21 Days (21 Working Days Standard)</option>
              <option value={20}>20 Days (Short Month / Alternate Policy)</option>
              <option value={23}>23 Days (Extended Month)</option>
              <option value={24}>24 Days (6-day week standard)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Effective Month / Period (Optional)
            </label>
            <input
              type="month"
              className="form-input w-full text-sm rounded-lg border-slate-300"
              value={effectivePeriod}
              onChange={(e) => setEffectivePeriod(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank to apply as the permanent default policy for all payroll periods.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Save Policy & Recompute
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
