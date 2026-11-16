import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Form, FormGroup, Label, Input, Select, Button } from '../../../components/Form';
import { DEPOSIT_CLOSE_OUTCOMES } from '../constants';
import { safeGetDate } from '../../../lib/utils';

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Closes an FD/TD/NSC: matured, renewed, or closed early. Closed holdings drop out of
// "Total Invested" and the maturity counters, and interest stops accruing at this date.
const CloseDepositModal = ({ investment, onConfirm, onCancel }) => {
  const maturity = safeGetDate(investment.maturityDate);
  const today = new Date();
  const pastMaturity = maturity && maturity <= today;
  const [status, setStatus] = useState(pastMaturity ? 'matured' : 'closed');
  const [closedDate, setClosedDate] = useState(toISO(pastMaturity ? maturity : today));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm({ status, closedDate });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col rounded-b-none sm:rounded-b-2xl max-h-[92dvh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Close {investment.type}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{investment.name}</p>
          </div>
          <button onClick={onCancel} aria-label="Close dialog"><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="p-6">
          {investment.lockInEnd && new Date(investment.lockInEnd) > new Date() && (
            <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Locked in until {investment.lockInEnd}. Closing a tax-saver deposit early is generally not permitted, and if it
              {investment.taxSaving ? ' is' : ' were'} allowed the 80C deduction claimed earlier can be reversed.
            </p>
          )}
          <Form id="close-deposit-form" onSubmit={handleSubmit} className="space-y-4">
            <FormGroup>
              <Label htmlFor="closeOutcome">Outcome</Label>
              <Select id="closeOutcome" value={status} onChange={e => setStatus(e.target.value)}>
                {DEPOSIT_CLOSE_OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="closedDate">Date</Label>
              <Input id="closedDate" type="date" required value={closedDate} onChange={e => setClosedDate(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">
                Interest in the Tax Summary stops accruing on this date. If you renewed, add the new deposit as a separate investment.
              </p>
            </FormGroup>
          </Form>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button type="button" onClick={onCancel} disabled={submitting} className="bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
          <Button type="submit" form="close-deposit-form" disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
            {submitting ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CloseDepositModal;
