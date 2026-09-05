import React from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function OverlapResolutionModal({
  open,
  onClose,
  employee,
  overlapInfo,
  periodStart,
  periodEnd,
  onSelectAdjust,
  onSelectOverride,
  onSelectSkip,
}) {
  if (!open || !employee || !overlapInfo) return null;

  const empName = employee.name || 'Employee';
  const firstPayslip = overlapInfo.overlappingPayslips?.[0];
  const existingPeriodFormatted = firstPayslip
    ? firstPayslip.formattedRange
    : 'existing period';

  const formatShortDate = (dStr) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const newPeriodFormatted = `${formatShortDate(periodStart)} to ${formatShortDate(periodEnd)}`;
  const remainders = overlapInfo.remainders || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Overlapping Pay Period Detected"
      size="lg"
    >
      <div className="space-y-5">
        {/* Warning Banner */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 leading-relaxed">
            <span className="font-semibold">{empName}</span> has already been paid for{' '}
            <span className="font-semibold text-amber-950">{existingPeriodFormatted}</span>. The new Payrun period (
            <span className="font-semibold">{newPeriodFormatted}</span>) overlaps with this. Do you want to manage this?
          </div>
        </div>

        {/* Existing Overlapping Payslips Detail */}
        {overlapInfo.overlappingPayslips?.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-700">Existing Paid/Validated Payslips:</div>
            {overlapInfo.overlappingPayslips.map((ps, idx) => (
              <div key={idx} className="flex items-center justify-between py-1">
                <span>{ps.payrunName} ({ps.formattedRange})</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">PAID</span>
              </div>
            ))}
          </div>
        )}

        {/* Resolution Options */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Resolution Option:</div>

          {/* Option 1: Adjust (Calculated Remainder) */}
          {remainders.length > 0 ? (
            remainders.map((rem, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectAdjust({
                    effectivePeriodStart: rem.startDate,
                    effectivePeriodEnd: rem.endDate,
                    formattedRange: rem.formatted,
                  });
                  onClose();
                }}
                className="w-full text-left p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500 transition-all flex items-start gap-3 group shadow-sm"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    Adjust to {rem.formatted}
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full uppercase">Recommended</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Auto-adjusts this employee's individual computation period within the batch to only the non-overlapping remainder, while keeping the rest of the batch at the original Payrun period.
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              Entire period overlaps with existing payments. No non-overlapping remainder is available for adjustment.
            </div>
          )}

          {/* Option 2: Include anyway (Override) */}
          <button
            onClick={() => {
              onSelectOverride();
              onClose();
            }}
            className="w-full text-left p-4 rounded-xl border border-amber-300 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-400 transition-all flex items-start gap-3 group"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 text-sm">
                Include anyway (full period, may cause duplicate payment)
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Allows explicit override, but permanently flags this Payslip with a visible duplicate period warning and audit timestamp.
              </div>
            </div>
          </button>

          {/* Option 3: Skip employee */}
          <button
            onClick={() => {
              onSelectSkip();
              onClose();
            }}
            className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-start gap-3 group"
          >
            <XCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5 group-hover:text-slate-600 transition-colors" />
            <div>
              <div className="font-semibold text-slate-800 text-sm">
                Skip this employee
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Removes {empName} from this Payrun's selection entirely.
              </div>
            </div>
          </button>
        </div>

        {/* Footer cancel */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
