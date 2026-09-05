import React, { useState, useEffect } from 'react';
import { holidayApi } from '../../services/apiServices';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';
import { Calendar, RefreshCw, Plus, CheckCircle, XCircle, AlertCircle, SunMedium } from 'lucide-react';
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SunMedium className="text-amber-500" size={20} />
            Festival & Public Holiday Review Panel
          </h3>
          <p className="text-xs text-slate-500">
            Review live suggestions from Calendarific / Nager.Date API. Approving a paid holiday deducts 1 working day (Mon-Fri) from draft payruns.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSync}
            loading={syncing}
            className="text-xs"
          >
            <RefreshCw size={14} className="mr-1" />
            Sync API
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowManualModal(true)}
            className="text-xs"
          >
            <Plus size={14} className="mr-1" />
            Add Custom Holiday
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-6 text-center text-slate-400 text-sm">Fetching holiday suggestions...</div>
      ) : suggestions.length === 0 ? (
        <div className="py-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Calendar size={28} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium">No Pending Holiday Suggestions</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            All festival and national holiday suggestions have been reviewed or no new holidays were found for this period.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
          {suggestions.map((item) => {
            const dateObj = new Date(item.date);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const isProcessing = processingId === item.id;

            return (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs flex flex-col items-center justify-center shrink-0 border border-amber-100">
                    <span>{dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</span>
                    <span className="text-sm leading-tight">{dateObj.getDate()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {item.source === 'API_CALENDARIFIC' ? 'Calendarific' : item.source === 'API_NAGER' ? 'Nager.Date' : 'Manual'}
                      </span>
                      {isWeekend && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                          Weekend (Sat/Sun)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDate(item.date)} • {isWeekend ? 'Will not reduce working days count (Weekend)' : 'Weekday (-1 Working Day if Paid)'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={isProcessing}
                    onClick={() => handleProcess(item.id, 'APPROVED_PAID')}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-2.5 h-8"
                  >
                    <CheckCircle size={13} className="mr-1" />
                    Approve (Paid)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={isProcessing}
                    onClick={() => handleProcess(item.id, 'APPROVED_UNPAID')}
                    className="text-xs py-1 px-2.5 h-8"
                  >
                    Unpaid
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={isProcessing}
                    onClick={() => handleProcess(item.id, 'REJECTED')}
                    className="text-xs py-1 px-2.5 h-8"
                  >
                    <XCircle size={13} className="mr-1" />
                    Reject
                  </Button>
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
