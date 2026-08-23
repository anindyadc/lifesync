import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Form, FormGroup, Label, Input, Button } from '../../../components/Form';

const todayISO = () => new Date().toISOString().slice(0, 10);

const SellInvestmentModal = ({ investment, onConfirm, onCancel }) => {
  const [soldDate, setSoldDate] = useState(todayISO());
  const [saleValue, setSaleValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Number(saleValue);
    if (!saleValue || isNaN(value) || value <= 0) {
      setError('Sale value must be greater than 0.');
      return;
    }
    if (!soldDate) {
      setError('Sale date is required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onConfirm({ soldDate, saleValue: value });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Sell / Redeem</h3>
            <p className="text-sm text-slate-500 mt-0.5">{investment.name}</p>
          </div>
          <button onClick={onCancel}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <div className="p-6">
          <Form id="sell-investment-form" onSubmit={handleSubmit} className="space-y-4">
            <FormGroup>
              <Label htmlFor="soldDate">Sale Date</Label>
              <Input
                id="soldDate"
                type="date"
                required
                value={soldDate}
                onChange={e => setSoldDate(e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="saleValue">Total Sale Value (₹)</Label>
              <Input
                id="saleValue"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 68000"
                required
                value={saleValue}
                onChange={e => setSaleValue(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Net proceeds you actually received. Realized gain/loss and its STCG/LTCG
                classification for the Tax Summary are computed from this against the
                amount invested and purchase date.
              </p>
            </FormGroup>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </Form>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button type="button" onClick={onCancel} disabled={submitting} className="bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
          <Button type="submit" form="sell-investment-form" disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
            {submitting ? 'Saving...' : 'Confirm Sale'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SellInvestmentModal;
