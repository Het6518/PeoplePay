import React, { useState, useEffect } from 'react';
import { holidayApi } from '../../services/apiServices';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';
import { Calendar, RefreshCw, Plus, CheckCircle, XCircle, SunMedium } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export function HolidayReviewWidget({ onHolidayUpdated }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Manual holiday modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualIsPaid, setManualIsPaid] = useState(true);
  const [manualLoading, setManualLoading] = useState(false);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const res = await holidayApi.getSuggestions();
      const data = res.data?.data || res.data || [];
      setSuggestions(data);
    } catch (err) {
      toast.error('Failed to load pending holiday suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await holidayApi.sync();
      const result = res.data?.data || res.data;
      if (result.warning) {
        toast((t) => (
          <div className="text-xs">
            <span className="font-semibold text-amber-700">Sync Notice:</span> {result.warning}
          </div>
        ), { icon: '⚠️' });
      } else {
        toast.success(`Synced ${result.count || 0} holidays via ${result.source}`);
      }
      await loadSuggestions();
    } catch (err) {
      toast.error('Failed to sync holidays from API');
    } finally {
      setSyncing(false);
    }
  };

  const handleProcess = async (id, status) => {
    setProcessingId(id);
    try {
      await holidayApi.processSuggestion(id, status);
      toast.success(`Holiday ${status === 'REJECTED' ? 'rejected' : 'approved'} successfully! Draft payruns updated.`);
      await loadSuggestions();
      if (onHolidayUpdated) onHolidayUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process holiday suggestion');
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualLoading(true);
    try {
      await holidayApi.createManual({
        name: manualName,
        date: manualDate,
        isPaid: manualIsPaid,
      });
      toast.success('Manual holiday created and draft payruns updated!');
      setShowManualModal(false);
      setManualName('');
      setManualDate('');
      await loadSuggestions();
      if (onHolidayUpdated) onHolidayUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create manual holiday');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="bg-white/95 rounded-[28px] p-6 border border-stone-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-700 flex items-center justify-center font-extrabold">
            <SunMedium size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-stone-950 uppercase tracking-wider flex items-center gap-2">
              Festival & Public Holiday Review
              {suggestions.length > 0 && (
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                  {suggestions.length} Pending
                </span>
              )}
            </h3>
            <p className="text-xs font-medium text-stone-500 mt-0.5">
              Review live festival suggestions. Approving paid holidays deducts 1 working day (Mon-Fri) from payruns.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs font-bold bg-stone-100 text-stone-800 hover:bg-stone-200 px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync API
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 px-3.5 py-2 rounded-full shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus size={14} />
            Add Custom
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-8 text-center text-stone-400 text-xs">Fetching holiday suggestions...</div>
      ) : suggestions.length === 0 ? (
        <div className="py-8 text-center text-stone-400 bg-stone-50/60 rounded-2xl border border-dashed border-stone-200 p-4">
          <Calendar size={24} className="mx-auto text-stone-300 mb-1.5" />
          <p className="text-xs font-bold text-stone-700">No Pending Holiday Suggestions</p>
          <p className="text-[11px] text-stone-400 mt-0.5">All festival suggestions have been reviewed for this period.</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1">
          {suggestions.map((item) => {
            const dateObj = new Date(item.date);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const isProcessing = processingId === item.id;

            return (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-900 font-black text-xs flex flex-col items-center justify-center shrink-0 border border-amber-300/40">
                    <span>{dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</span>
                    <span className="text-sm font-mono leading-none">{dateObj.getDate()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-stone-900 text-sm">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-semibold">
                        {item.source === 'API_CALENDARIFIC' ? 'Calendarific' : item.source === 'API_NAGER' ? 'Nager.Date' : 'Manual'}
                      </span>
                      {isWeekend && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                          Weekend (Sat/Sun)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 font-medium mt-0.5">
                      {formatDate(item.date)} • {isWeekend ? 'Will not reduce working days count (Weekend)' : 'Weekday (-1 Working Day if Paid)'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    disabled={isProcessing}
                    onClick={() => handleProcess(item.id, 'APPROVED_PAID')}
                    className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs flex items-center gap-1"
                  >
                    <CheckCircle size={13} /> Paid
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleProcess(item.id, 'APPROVED_UNPAID')}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-stone-200 hover:bg-stone-300 text-stone-800 transition-all"
                  >
                    Unpaid
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleProcess(item.id, 'REJECTED')}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 hover:bg-rose-100 hover:text-rose-700 transition-all flex items-center gap-1"
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Holiday Modal */}
      <Modal open={showManualModal} onClose={() => setShowManualModal(false)} title="Add Custom / Company Holiday" size="md">
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Holiday Name
            </label>
            <input
              type="text"
              className="form-input w-full text-sm rounded-lg border-slate-300"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. Company Foundation Day"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              className="form-input w-full text-sm rounded-lg border-slate-300"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="manualPaid"
              className="form-checkbox text-primary-600 rounded"
              checked={manualIsPaid}
              onChange={(e) => setManualIsPaid(e.target.checked)}
            />
            <label htmlFor="manualPaid" className="text-sm text-slate-700">
              Paid Holiday (deducts 1 working day if weekday)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setShowManualModal(false)} disabled={manualLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={manualLoading}>
              Add Holiday & Update Payruns
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
