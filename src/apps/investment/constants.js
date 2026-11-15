// Kept out of any component file so Fast Refresh doesn't choke on non-component
// exports (same reasoning as WalletWatch's constants.js).
export const INVESTMENT_TYPES = ['FD', 'TD', 'NSC', 'Mutual Fund', 'Stocks', 'Smallcase', 'Gold', 'Real Estate', 'Other'];
export const INVESTMENT_HOLDERS = ['Self', 'Wife', 'Mother', 'Joint', 'Other'];
// Types that trade on the market and never "mature" — units/current value/SIP apply,
// maturity date doesn't. Capital gains (via the Sell action) apply only to these.
export const MARKET_LINKED_TYPES = ['Mutual Fund', 'Stocks', 'Smallcase'];
// Types with a bank/post-office-style interest rate the Tax Summary can accrue per FY.
export const INTEREST_BEARING_TYPES = ['FD', 'TD', 'NSC'];
// Fixed-return instruments with a promised payout at maturity — these get the
// optional Maturity Amount field. TD = Post Office Time Deposit.
export const FIXED_RETURN_TYPES = ['FD', 'TD', 'NSC'];
// Issued by India Post, so the Name / Bank field is pre-filled with "Post Office".
// FD is bank-only.
export const POST_OFFICE_TYPES = ['TD', 'NSC'];
export const POST_OFFICE_NAME = 'Post Office';
// Types that carry an account / certificate number.
export const ACCOUNT_NUMBER_TYPES = ['FD', 'TD', 'NSC'];
export const SIP_FREQUENCIES = ['monthly', 'weekly', 'quarterly'];

// Lifecycle for fixed-return holdings (FD/TD/NSC). Market-linked ones use 'sold'.
export const CLOSED_STATUSES = ['sold', 'matured', 'closed', 'renewed'];
export const DEPOSIT_CLOSE_OUTCOMES = [
  { value: 'matured', label: 'Matured (paid out)' },
  { value: 'renewed', label: 'Renewed / rolled over' },
  { value: 'closed', label: 'Closed early (premature)' },
];
export const STATUS_LABELS = { sold: 'Sold', matured: 'Matured', closed: 'Closed early', renewed: 'Renewed' };
export const isActiveHolding = (inv) => !CLOSED_STATUSES.includes(inv.status);

// Mutual-fund category drives capital-gains classification. Since 1 Apr 2023,
// debt-fund gains are taxed at the holder's slab rate regardless of holding period.
export const FUND_CATEGORIES = [
  { value: 'equity', label: 'Equity / Equity-oriented' },
  { value: 'elss', label: 'ELSS (tax-saving equity fund)' },
  { value: 'debt', label: 'Debt / Liquid / Other specified' },
];

// Compounding schedule for fixed-return interest estimates.
export const COMPOUNDING_OPTIONS = [
  { value: 'quarterly', label: 'Quarterly', n: 4 },
  { value: 'half-yearly', label: 'Half-yearly', n: 2 },
  { value: 'yearly', label: 'Yearly', n: 1 },
  { value: 'monthly', label: 'Monthly', n: 12 },
  { value: 'simple', label: 'Simple (no compounding)', n: 0 },
];
export const DEFAULT_COMPOUNDING = { FD: 'quarterly', TD: 'quarterly', NSC: 'yearly' };
export const NOMINEE_RELATIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Sibling', 'Other'];

export const maskAccountNumber = (value) => {
  if (!value) return '';
  const s = String(value);
  return s.length <= 4 ? s : `${'X'.repeat(Math.min(s.length - 4, 8))}${s.slice(-4)}`;
};

// Section 80C (old tax regime only): deduction cap per taxpayer per financial year.
// Kept here so the yearly Budget check is a one-line change.
export const SECTION_80C_LIMIT = 150000;

// Standard lock-in / eligibility defaults. All are editable in the form:
// - NSC: 5-year lock-in, 80C eligible.
// - ELSS: 3-year lock-in, 80C eligible.
// - FD / Post Office TD: 80C only when the tenure is 5 years (tax-saver FD / 5-year TD),
//   with a 5-year lock-in.
const addYears = (date, years) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// investmentDate / maturityDate are already-resolved Date objects (or null).
export const getTaxDefaults = ({ type, fundCategory, investmentDate, maturityDate }) => {
  if (!investmentDate) return { taxSaving: false, lockInEnd: '' };
  if (type === 'NSC') return { taxSaving: true, lockInEnd: toISO(addYears(investmentDate, 5)) };
  if (type === 'Mutual Fund' && fundCategory === 'elss') return { taxSaving: true, lockInEnd: toISO(addYears(investmentDate, 3)) };
  if ((type === 'FD' || type === 'TD') && maturityDate) {
    const fiveYears = addYears(investmentDate, 5);
    // A day of slack so a "5-year" deposit ending the day before the anniversary qualifies.
    if (maturityDate >= new Date(fiveYears.getTime() - 86400000)) return { taxSaving: true, lockInEnd: toISO(fiveYears) };
  }
  return { taxSaving: false, lockInEnd: '' };
};
