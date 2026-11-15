import React, { useState, useRef } from 'react';
import { X, Loader2, PiggyBank } from 'lucide-react';
import { Form, FormGroup, Label, Input, Select, Button, Textarea } from '../../../components/Form';
import { safeGetDate } from '../../../lib/utils';
import { estimateMaturityValue } from '../lib/financialYear';
import { INVESTMENT_TYPES, INVESTMENT_HOLDERS, MARKET_LINKED_TYPES, INTEREST_BEARING_TYPES, FIXED_RETURN_TYPES, POST_OFFICE_TYPES, POST_OFFICE_NAME, ACCOUNT_NUMBER_TYPES, SIP_FREQUENCIES, FUND_CATEGORIES, getTaxDefaults, COMPOUNDING_OPTIONS, DEFAULT_COMPOUNDING, NOMINEE_RELATIONS } from '../constants';

const emptyFormData = {
  holder: 'Self',
  type: 'FD',
  name: '',
  amount: '',
  maturityDate: '',
  maturityAmount: '',
  accountNumber: '',
  compounding: '',
  fundCategory: 'equity',
  nominee: '',
  nomineeRelation: '',
  taxSaving: false,
  lockInEnd: '',
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

const SectionTitle = ({ children }) => (
  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 pt-2 pb-1 border-b border-slate-100">{children}</h4>
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
    maturityAmount: initialData.maturityAmount || '',
    accountNumber: initialData.accountNumber || '',
    compounding: initialData.compounding || '',
    fundCategory: initialData.fundCategory || 'equity',
    nominee: initialData.nominee || '',
    nomineeRelation: initialData.nomineeRelation || '',
    taxSaving: !!initialData.taxSaving,
    lockInEnd: initialData.lockInEnd || '',
  } : emptyFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Once the user touches a tax field themselves, stop overwriting it with the standard default.
  // Records saved before these fields existed are treated as untouched, so editing one
  // fills in the defaults.
  const lockManual = useRef(!!initialData?.lockInEnd);
  const taxManual = useRef(initialData?.taxSaving !== undefined);
  const [tenureValue, setTenureValue] = useState('');
  const [tenureUnit, setTenureUnit] = useState('years');

  const isMarketLinked = MARKET_LINKED_TYPES.includes(formData.type);
  const isInterestBearing = INTEREST_BEARING_TYPES.includes(formData.type);
  const patch = (updates) => setFormData(prev => {
    const next = { ...prev, ...updates };
    if (!lockManual.current || !taxManual.current) {
      const defaults = getTaxDefaults({
        type: next.type, fundCategory: next.fundCategory,
        investmentDate: safeGetDate(next.investmentDate), maturityDate: safeGetDate(next.maturityDate),
      });
      if (!taxManual.current) next.taxSaving = defaults.taxSaving;
      if (!lockManual.current) next.lockInEnd = defaults.lockInEnd;
    }
    return next;
  });

  const isFixedReturn = FIXED_RETURN_TYPES.includes(formData.type);
  const isPostOffice = POST_OFFICE_TYPES.includes(formData.type);
  const hasAccountNumber = ACCOUNT_NUMBER_TYPES.includes(formData.type);
  const effectiveCompounding = formData.compounding || DEFAULT_COMPOUNDING[formData.type] || 'simple';
  const compoundingN = COMPOUNDING_OPTIONS.find(o => o.value === effectiveCompounding)?.n ?? 0;
  const estimatedMaturity = isFixedReturn
    ? estimateMaturityValue(Number(formData.amount), Number(formData.interestRate), safeGetDate(formData.investmentDate), safeGetDate(formData.maturityDate), compoundingN)
    : null;

  const applyTenure = () => {
    const start = safeGetDate(formData.investmentDate);
    const n = Number(tenureValue);
    if (!start || !n || n <= 0) {
      setError('Enter the investment date and a tenure first.');
      return;
    }
    const end = new Date(start);
    end.setMonth(end.getMonth() + (tenureUnit === 'years' ? Math.round(n * 12) : Math.round(n)));
    const iso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    setError('');
    patch({ maturityDate: iso });
  };

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
    if (!isMarketLinked && formData.investmentDate && formData.maturityDate) {
      const s = safeGetDate(formData.investmentDate);
      const m = safeGetDate(formData.maturityDate);
      if (s && m && m <= s) {
        setError('Maturity date must be after the investment date.');
        return;
      }
    }
    if (formData.maturityAmount !== '' && (isNaN(Number(formData.maturityAmount)) || Number(formData.maturityAmount) <= 0)) {
      setError('Maturity amount must be greater than 0.');
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
        maturityAmount: isFixedReturn ? formData.maturityAmount : '',
        compounding: isInterestBearing ? formData.compounding : '',
        fundCategory: formData.type === 'Mutual Fund' ? formData.fundCategory : '',
        taxSaving: !!formData.taxSaving,
        lockInEnd: formData.lockInEnd || '',
        nominee: formData.nominee.trim(),
        nomineeRelation: formData.nominee.trim() ? formData.nomineeRelation : '',
        accountNumber: hasAccountNumber ? formData.accountNumber.trim() : '',
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
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl"><PiggyBank size={18} /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">{initialData ? 'Edit Investment' : 'New Investment'}</h3>
            <p className="text-xs text-slate-500">{initialData ? 'Update the details below' : 'Fields marked by the form adapt to the type you pick'}</p>
          </div>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close form" className="p-1.5 rounded-lg hover:bg-slate-100"><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        <Form id="investment-form" onSubmit={handleSubmit} className="space-y-4">
          <SectionTitle>Basics</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              onChange={e => {
                const type = e.target.value;
                setFormData(prev => {
                  let name = prev.name;
                  if (POST_OFFICE_TYPES.includes(type) && !name.trim()) name = POST_OFFICE_NAME;
                  // Leaving a post-office type for FD: drop the auto-filled value (FD is bank-only).
                  else if (!POST_OFFICE_TYPES.includes(type) && name === POST_OFFICE_NAME) name = '';
                  return { ...prev, type, name };
                });
                patch({ type });
              }}
            >
              {INVESTMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormGroup>

          </div>

          {formData.type === 'Mutual Fund' && (
            <FormGroup>
              <Label htmlFor="fundCategory">Fund Category</Label>
              <Select id="fundCategory" value={formData.fundCategory} onChange={e => patch({ fundCategory: e.target.value })}>
                {FUND_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
              <p className="text-xs text-slate-400 mt-1">Debt funds are taxed at your slab rate (no long-term benefit) for units bought on/after 1 Apr 2023.</p>
            </FormGroup>
          )}

          <FormGroup>
            <Label htmlFor="name">{isPostOffice ? 'Institution' : formData.type === 'FD' ? 'Bank Name' : 'Investment Name / Bank'}</Label>
            <Input
              id="name"
              type="text"
              placeholder={isPostOffice ? 'Post Office' : formData.type === 'FD' ? 'e.g. SBI, HDFC Bank' : 'e.g. HDFC Flexicap Fund, Smallcase: Rebalancer'}
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </FormGroup>

          <SectionTitle>Amount &amp; Returns</SectionTitle>
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

          {hasAccountNumber && (
            <FormGroup>
              <Label htmlFor="accountNumber">
                {formData.type === 'NSC' ? 'NSC Certificate No. (optional)' : `${formData.type} Account Number (optional)`}
              </Label>
              <Input
                id="accountNumber"
                type="text"
                placeholder="e.g. 1234567890"
                value={formData.accountNumber}
                onChange={e => setFormData({...formData, accountNumber: e.target.value})}
              />
            </FormGroup>
          )}

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
              <p className="text-xs text-slate-400 mt-1">Used by Tax Summary to estimate interest income per financial year.</p>
            </FormGroup>
          )}

          {isInterestBearing && (
            <FormGroup>
              <Label htmlFor="compounding">Interest Compounding</Label>
              <Select id="compounding" value={effectiveCompounding} onChange={e => setFormData({...formData, compounding: e.target.value})}>
                {COMPOUNDING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              <p className="text-xs text-slate-400 mt-1">Defaults: FD and Post Office TD quarterly, NSC yearly. Check your receipt.</p>
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

          <SectionTitle>Dates</SectionTitle>
          {(isMarketLinked || isInterestBearing) && (
            <FormGroup>
              <Label htmlFor="investmentDate">{isSip ? 'SIP Start Date' : 'Investment / Purchase Date'}</Label>
              <Input
                id="investmentDate"
                type="date"
                required
                value={formData.investmentDate}
                onChange={e => patch({ investmentDate: e.target.value })}
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
                onChange={e => patch({ maturityDate: e.target.value })}
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500">or set from tenure:</span>
                <input
                  type="number" min="0" step="0.5" aria-label="Tenure"
                  value={tenureValue} onChange={e => setTenureValue(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                />
                <select aria-label="Tenure unit" value={tenureUnit} onChange={e => setTenureUnit(e.target.value)} className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500">
                  <option value="years">years</option>
                  <option value="months">months</option>
                </select>
                <button type="button" onClick={applyTenure} className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg">Apply</button>
              </div>
            </FormGroup>
          )}

          {isFixedReturn && (
            <FormGroup>
              <Label htmlFor="maturityAmount">Maturity Amount (₹, optional)</Label>
              {initialData && initialData.maturityAmount === null && <UndecryptableWarning fieldLabel="maturity amount" />}
              <Input
                id="maturityAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 71000"
                value={formData.maturityAmount}
                onChange={e => setFormData({...formData, maturityAmount: e.target.value})}
              />
              <p className="text-xs text-slate-400 mt-1">The promised payout at maturity, as stated on the receipt/certificate.</p>
              {estimatedMaturity && (
                <p className="text-xs text-slate-500 mt-1">
                  Estimated from rate &amp; compounding: ≈ ₹{Math.round(estimatedMaturity).toLocaleString('en-IN')}
                  {formData.maturityAmount && Math.abs(Number(formData.maturityAmount) - estimatedMaturity) / estimatedMaturity > 0.02 &&
                    <span className="text-amber-600"> — differs from your entry by over 2%; double-check the rate, dates or amount.</span>}
                </p>
              )}
            </FormGroup>
          )}

          {!isMarketLinked || formData.type === 'Mutual Fund' ? (
            <>
            <SectionTitle>Tax &amp; Lock-in</SectionTitle>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox" className="mt-0.5"
                  checked={formData.taxSaving}
                  onChange={e => { taxManual.current = true; setFormData(prev => ({ ...prev, taxSaving: e.target.checked })); }}
                />
                <span>
                  Eligible for Section 80C deduction (old tax regime)
                  <span className="block text-xs text-slate-400">
                    Auto-set for NSC, ELSS and FD/TD of 5 years or more; you can override it.
                  </span>
                </span>
              </label>
              <FormGroup>
                <Label htmlFor="lockInEnd">Lock-in Ends (optional)</Label>
                <Input
                  id="lockInEnd" type="date" value={formData.lockInEnd}
                  onChange={e => { lockManual.current = true; setFormData(prev => ({ ...prev, lockInEnd: e.target.value })); }}
                />
                <p className="text-xs text-slate-400 mt-1">Standard: NSC 5 yrs, ELSS 3 yrs, tax-saver FD/TD 5 yrs from the investment date. Editable.</p>
              </FormGroup>
            </div>
            </>
          ) : null}

          <SectionTitle>Nominee &amp; Notes</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormGroup>
              <Label htmlFor="nominee">Nominee (optional)</Label>
              <Input id="nominee" type="text" placeholder="Nominee name" value={formData.nominee} onChange={e => setFormData({...formData, nominee: e.target.value})} />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="nomineeRelation">Relationship</Label>
              <Select id="nomineeRelation" value={formData.nomineeRelation} disabled={!formData.nominee.trim()} onChange={e => setFormData({...formData, nomineeRelation: e.target.value})}>
                <option value="">Select…</option>
                {NOMINEE_RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </FormGroup>
          </div>

          <FormGroup>
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              rows="3"
              placeholder="e.g. nominee, folio number, remarks"
              value={formData.details}
              onChange={e => setFormData({...formData, details: e.target.value})}
            />
          </FormGroup>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </Form>
      </div>

      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl shrink-0">
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
