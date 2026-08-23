import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Form, FormGroup, Label, Input, Select, Button, Textarea } from '../../../components/Form';
import { INVESTMENT_TYPES, INVESTMENT_HOLDERS, MARKET_LINKED_TYPES, INTEREST_BEARING_TYPES, SIP_FREQUENCIES } from '../constants';

const emptyFormData = {
  holder: 'Self',
  type: 'FD',
  name: '',
  amount: '',
  maturityDate: '',
  details: '',
  investmentDate: '',
  interestRate: '',
  investmentMode: 'lumpsum',
  units: '',
  purchasePrice: '',
  currentValue: '',
  sipFrequency: 'monthly',
  sipAmount: '',
};

const UndecryptableWarning = ({ fieldLabel }) => (
  <p className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-1">
    The original {fieldLabel} couldn't be decrypted and is not shown here — entering
    a new value below will permanently overwrite it. Cancel instead if you just
    wanted to view this record.
  </p>
);

const InvestmentForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(initialData ? {
    ...emptyFormData,
    ...initialData,
    amount: initialData.amount || '',
    investmentMode: initialData.investmentMode || 'lumpsum',
    sipFrequency: initialData.sipFrequency || 'monthly',
    units: initialData.units ?? '',
    purchasePrice: initialData.purchasePrice || '',
    currentValue: initialData.currentValue || '',
    sipAmount: initialData.sipAmount || '',
  } : emptyFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isMarketLinked = MARKET_LINKED_TYPES.includes(formData.type);
  const isInterestBearing = INTEREST_BEARING_TYPES.includes(formData.type);
  const isSip = isMarketLinked && formData.investmentMode === 'sip';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountValue = Number(formData.amount);
    if (!formData.amount || isNaN(amountValue) || amountValue <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!isMarketLinked && !formData.maturityDate) {
      setError('Maturity date is required.');
      return;
    }
    if (isMarketLinked && !formData.investmentDate) {
      setError('Investment/purchase date is required for market-linked investments — it drives holding-period and tax classification.');
      return;
    }
    if (isSip && (!formData.sipAmount || isNaN(Number(formData.sipAmount)) || Number(formData.sipAmount) <= 0)) {
      setError('SIP installment amount must be greater than 0.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        holder: formData.holder,
        type: formData.type,
        name: formData.name,
        amount: formData.amount,
        details: formData.details,
        maturityDate: isMarketLinked ? '' : formData.maturityDate,
        investmentDate: (isMarketLinked || isInterestBearing) ? formData.investmentDate : (formData.investmentDate || ''),
        interestRate: isInterestBearing ? formData.interestRate : '',
        investmentMode: isMarketLinked ? formData.investmentMode : '',
        units: isMarketLinked ? formData.units : '',
        purchasePrice: isMarketLinked ? formData.purchasePrice : '',
        currentValue: isMarketLinked ? formData.currentValue : '',
        sipFrequency: isSip ? formData.sipFrequency : '',
        sipAmount: isSip ? formData.sipAmount : '',
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
        <h3 className="text-lg font-bold">{initialData ? 'Edit Investment' : 'New Investment'}</h3>
        <button onClick={onCancel}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        <Form id="investment-form" onSubmit={handleSubmit} className="space-y-4">
          <FormGroup>
            <Label htmlFor="holder">Investment Holder</Label>
            <Select
              id="holder"
              value={formData.holder}
              onChange={e => setFormData({...formData, holder: e.target.value})}
            >
              {INVESTMENT_HOLDERS.map(holder => (
                <option key={holder} value={holder}>{holder}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="type">Investment Type</Label>
            <Select
              id="type"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              {INVESTMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="name">Investment Name / Bank</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. SBI Fixed Deposit, HDFC Flexicap Fund, Smallcase: Rebalancer"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="amount">{isMarketLinked ? 'Amount Invested (₹)' : 'Amount (₹)'}</Label>
            {initialData && initialData.amount === null && <UndecryptableWarning fieldLabel="amount" />}
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50000"
              required
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
            />
          </FormGroup>

          {isInterestBearing && (
            <FormGroup>
              <Label htmlFor="interestRate">Interest Rate (% p.a., optional)</Label>
              <Input
                id="interestRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 7.1"
                value={formData.interestRate}
                onChange={e => setFormData({...formData, interestRate: e.target.value})}
              />
              <p className="text-xs text-slate-400 mt-1">Used by Tax Summary to estimate interest income per financial year (simple interest).</p>
            </FormGroup>
          )}

          {isMarketLinked && (
            <>
              <FormGroup>
                <Label htmlFor="investmentMode">Investment Mode</Label>
                <Select
                  id="investmentMode"
                  value={formData.investmentMode}
                  onChange={e => setFormData({...formData, investmentMode: e.target.value})}
                >
                  <option value="lumpsum">Lump Sum</option>
                  <option value="sip">SIP</option>
                </Select>
              </FormGroup>

              {isSip && (
                <div className="grid grid-cols-2 gap-3">
                  <FormGroup>
                    <Label htmlFor="sipFrequency">SIP Frequency</Label>
                    <Select
                      id="sipFrequency"
                      value={formData.sipFrequency}
                      onChange={e => setFormData({...formData, sipFrequency: e.target.value})}
                    >
                      {SIP_FREQUENCIES.map(f => (
                        <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="sipAmount">Installment (₹)</Label>
                    {initialData && initialData.sipAmount === null && <UndecryptableWarning fieldLabel="SIP installment amount" />}
                    <Input
                      id="sipAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={formData.sipAmount}
                      onChange={e => setFormData({...formData, sipAmount: e.target.value})}
                    />
                  </FormGroup>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormGroup>
                  <Label htmlFor="units">Units / Quantity (optional)</Label>
                  <Input
                    id="units"
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="e.g. 120"
                    value={formData.units}
                    onChange={e => setFormData({...formData, units: e.target.value})}
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="purchasePrice">Purchase Price / Unit (₹, optional)</Label>
                  {initialData && initialData.purchasePrice === null && <UndecryptableWarning fieldLabel="purchase price" />}
                  <Input
                    id="purchasePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 415.50"
                    value={formData.purchasePrice}
                    onChange={e => setFormData({...formData, purchasePrice: e.target.value})}
                  />
                </FormGroup>
              </div>

              <FormGroup>
                <Label htmlFor="currentValue">Current Value (₹, optional)</Label>
                {initialData && initialData.currentValue === null && <UndecryptableWarning fieldLabel="current value" />}
                <Input
                  id="currentValue"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 62000"
                  value={formData.currentValue}
                  onChange={e => setFormData({...formData, currentValue: e.target.value})}
                />
                <p className="text-xs text-slate-400 mt-1">Update this occasionally to see gain/loss on the Dashboard — it's not fetched automatically.</p>
              </FormGroup>
            </>
          )}

          {(isMarketLinked || isInterestBearing) && (
            <FormGroup>
              <Label htmlFor="investmentDate">{isSip ? 'SIP Start Date' : 'Investment / Purchase Date'}</Label>
              <Input
                id="investmentDate"
                type="date"
                required
                value={formData.investmentDate}
                onChange={e => setFormData({...formData, investmentDate: e.target.value})}
              />
              {isMarketLinked && (
                <p className="text-xs text-slate-400 mt-1">
                  Drives holding-period (STCG/LTCG) classification on sale.
                  {isSip && ' For SIPs this is treated as one lot from the start date, not per-installment — see the Tax Summary tab.'}
                </p>
              )}
            </FormGroup>
          )}

          {!isMarketLinked && (
            <FormGroup>
              <Label htmlFor="maturityDate">Maturity Date</Label>
              <Input
                id="maturityDate"
                type="date"
                required
                value={formData.maturityDate}
                onChange={e => setFormData({...formData, maturityDate: e.target.value})}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              rows="3"
              placeholder="e.g. FD number: 12345, NSC serial: A123456, folio number"
              value={formData.details}
              onChange={e => setFormData({...formData, details: e.target.value})}
            />
          </FormGroup>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </Form>
      </div>

      <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
        <Button type="button" onClick={onCancel} disabled={submitting} className="bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
        <Button type="submit" form="investment-form" disabled={submitting}>
          {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
          {submitting ? 'Saving...' : 'Save Investment'}
        </Button>
      </div>
    </div>
  );
};

export default InvestmentForm;
