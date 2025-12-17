import { CreditCard, Banknote } from 'lucide-react';

export const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', color: '#f97316', bg: 'bg-orange-100 text-orange-600' },
  { id: 'travel', label: 'Travel', color: '#3b82f6', bg: 'bg-blue-100 text-blue-600' },
  { id: 'shopping', label: 'Shopping', color: '#a855f7', bg: 'bg-purple-100 text-purple-600' },
  { id: 'utilities', label: 'Bills', color: '#eab308', bg: 'bg-yellow-100 text-yellow-600' },
  { id: 'health', label: 'Health', color: '#22c55e', bg: 'bg-green-100 text-green-600' },
  { id: 'entertainment', label: 'Fun', color: '#ec4899', bg: 'bg-pink-100 text-pink-600' },
  { id: 'other', label: 'Other', color: '#6b7280', bg: 'bg-gray-100 text-gray-600' },
];

export const PAYMENT_MODES = [
  { id: 'upi', label: 'UPI', icon: CreditCard },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
];