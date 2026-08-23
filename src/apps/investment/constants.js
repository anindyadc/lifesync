// Kept out of any component file so Fast Refresh doesn't choke on non-component
// exports (same reasoning as WalletWatch's constants.js).
export const INVESTMENT_TYPES = ['NSC', 'FD', 'Mutual Fund', 'Stocks', 'Smallcase', 'Gold', 'Real Estate', 'Other'];
export const INVESTMENT_HOLDERS = ['Self', 'Wife', 'Mother', 'Joint', 'Other'];
// Types that trade on the market and never "mature" — units/current value/SIP apply,
// maturity date doesn't. Capital gains (via the Sell action) apply only to these.
export const MARKET_LINKED_TYPES = ['Mutual Fund', 'Stocks', 'Smallcase'];
// Types with a bank/post-office-style interest rate the Tax Summary can accrue per FY.
export const INTEREST_BEARING_TYPES = ['FD', 'NSC'];
export const SIP_FREQUENCIES = ['monthly', 'weekly', 'quarterly'];
