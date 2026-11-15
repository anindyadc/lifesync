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
