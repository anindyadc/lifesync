/**
 * TaskFlow Constants
 * Centralized configuration for task categories.
 */

import { ListChecks, Briefcase, User, ShoppingBag, HeartPulse, Tag } from 'lucide-react';

// Same validated categorical palette used by WalletWatch (CVD-checked) — assignment is
// by creation-order slot index (see getCategoryColor below), never re-derived from
// content, so a category's color stays stable and stays inside the validated set.
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

// `id` intentionally equals the existing plain-string `category` value already stored on
// tasks (e.g. "General"), not a lowercase slug, so pre-existing Firestore documents keep
// matching without a migration.
export const DEFAULT_CATEGORIES = [
  { id: 'General', label: 'General', ...CATEGORICAL_PALETTE[0] },
  { id: 'Work', label: 'Work', ...CATEGORICAL_PALETTE[1] },
  { id: 'Personal', label: 'Personal', ...CATEGORICAL_PALETTE[2] },
  { id: 'Shopping', label: 'Shopping', ...CATEGORICAL_PALETTE[3] },
  { id: 'Health', label: 'Health', ...CATEGORICAL_PALETTE[4] },
];

// Icons for the fixed default category ids; custom user-added categories (arbitrary ids)
// fall back to DEFAULT_CATEGORY_ICON.
export const CATEGORY_ICONS = {
  General: ListChecks,
  Work: Briefcase,
  Personal: User,
  Shopping: ShoppingBag,
  Health: HeartPulse,
};
export const DEFAULT_CATEGORY_ICON = Tag;

// Assigns the next validated slot by creation order (existingCount = categories.length
// at the time a new one is added) — deterministic, not a content hash.
export const getCategoryColor = (existingCount) =>
  CATEGORICAL_PALETTE[existingCount % CATEGORICAL_PALETTE.length];
