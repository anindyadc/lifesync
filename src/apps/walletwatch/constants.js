/**
 * WalletWatch Constants
 * Centralized configuration for categories and payment modes.
 */

import { Smartphone, Banknote, CreditCard } from 'lucide-react';

// Validated categorical palette (CVD-checked via the dataviz skill's validate_palette.js —
// all 8 slots pass the lightness/chroma/CVD-separation checks). Fixed order: assignment is
// by creation-order slot index (see getCategoryColor below), never re-derived from content,
// so a category's color stays stable and stays inside the validated set.
export const CATEGORICAL_PALETTE = [
  { color: '#2a78d6', bg: 'bg-blue-100 text-blue-700' },
  { color: '#1baf7a', bg: 'bg-teal-100 text-teal-700' },
  { color: '#eda100', bg: 'bg-amber-100 text-amber-700' },
  { color: '#008300', bg: 'bg-green-100 text-green-700' },
  { color: '#4a3aa7', bg: 'bg-violet-100 text-violet-700' },
  { color: '#e34948', bg: 'bg-red-100 text-red-700' },
  { color: '#e87ba4', bg: 'bg-pink-100 text-pink-700' },
  { color: '#eb6834', bg: 'bg-orange-100 text-orange-700' },
];

// Muted gray "Other" bucket for the 9th+ category folded together in charts.
export const OTHER_SLOT = { color: '#898781', bg: 'bg-slate-200 text-slate-600' };

// Reserved status colors — deltas/trends only, never reused as a category color.
export const STATUS_COLORS = { good: '#0ca30c', critical: '#d03b3b' };

export const DEFAULT_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', ...CATEGORICAL_PALETTE[0] },
  { id: 'travel', label: 'Travel', ...CATEGORICAL_PALETTE[1] },
  { id: 'shopping', label: 'Shopping', ...CATEGORICAL_PALETTE[2] },
  { id: 'utilities', label: 'Bills', ...CATEGORICAL_PALETTE[3] },
  { id: 'health', label: 'Health', ...CATEGORICAL_PALETTE[4] },
  { id: 'entertainment', label: 'Fun', ...CATEGORICAL_PALETTE[5] },
  { id: 'reimbursement', label: 'Lent/Reimburse', ...CATEGORICAL_PALETTE[6] },
  { id: 'other', label: 'Other', ...CATEGORICAL_PALETTE[7] },
];

export const PAYMENT_MODES = [
  { id: 'upi', label: 'UPI', icon: Smartphone, ...CATEGORICAL_PALETTE[0] },
  { id: 'cash', label: 'Cash', icon: Banknote, ...CATEGORICAL_PALETTE[1] },
  { id: 'card', label: 'Card', icon: CreditCard, ...CATEGORICAL_PALETTE[2] },
];

// Assigns the next validated slot by creation order (existingCount = categories.length
// at the time a new one is added) — deterministic, not a content hash.
export const getCategoryColor = (existingCount) =>
  CATEGORICAL_PALETTE[existingCount % CATEGORICAL_PALETTE.length];
