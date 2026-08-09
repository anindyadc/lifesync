import { clampDayToMonth } from '../hooks/useFixedExpenses';

/**
 * Resolves which credit-card billing cycle a given date falls into, and that cycle's
 * [start, end] range, given the card's configured `cycleStartDay` (1-31). A
 * `cycleStartDay` of 1 degenerates to a plain calendar month.
 *
 * e.g. cycleStartDay=5, date=Jul 20 → cycle starts Jul 5, ends Aug 4.
 *      cycleStartDay=5, date=Jul 3  → cycle starts Jun 5, ends Jul 4 (date hasn't
 *      reached this month's start day yet, so it belongs to the cycle that opened
 *      the previous month).
 */
export const getCycleForDate = (date, cycleStartDay) => {
  const day = date.getDate();
  const rawMonth = date.getMonth() - (day < cycleStartDay ? 1 : 0);
  // Route through Date's own month-rollover normalization (e.g. month=-1 → Dec of the
  // prior year) instead of hand-rolling year/month carry logic.
  const startAnchor = new Date(date.getFullYear(), rawMonth, 1);
  const normYear = startAnchor.getFullYear();
  const normMonth = startAnchor.getMonth();

  const startDay = clampDayToMonth(normYear, normMonth, cycleStartDay);
  const cycleStart = new Date(normYear, normMonth, startDay);

  const nextAnchor = new Date(normYear, normMonth + 1, 1);
  const nextStartDay = clampDayToMonth(nextAnchor.getFullYear(), nextAnchor.getMonth(), cycleStartDay);
  // day (nextStartDay - 1) normalizes to the last day of the current cycle's month when
  // nextStartDay is 1, which is exactly the plain-calendar-month case.
  const cycleEnd = new Date(nextAnchor.getFullYear(), nextAnchor.getMonth(), nextStartDay - 1);

  const cycleKey = `${normYear}-${String(normMonth + 1).padStart(2, '0')}`;
  return { cycleKey, cycleStart, cycleEnd };
};

// Resolves the cycle immediately before the given one, for walking back cycle history.
export const getPreviousCycle = (cycle, cycleStartDay) => {
  const dayBefore = new Date(cycle.cycleStart);
  dayBefore.setDate(dayBefore.getDate() - 1);
  return getCycleForDate(dayBefore, cycleStartDay);
};

// Resolves the cycle immediately after the given one — used to walk forward from a
// prepaid card's starting-balance date up to the current cycle, accumulating balance.
export const getNextCycle = (cycle, cycleStartDay) => {
  const dayAfter = new Date(cycle.cycleEnd);
  dayAfter.setDate(dayAfter.getDate() + 1);
  return getCycleForDate(dayAfter, cycleStartDay);
};

// Walks `steps` cycles backward from whichever cycle `date` falls in — for callers that
// only need "N cycles ago" (e.g. a prev/next cycle stepper) rather than a full history list.
export const getCycleNStepsBack = (date, cycleStartDay, steps) => {
  let cycle = getCycleForDate(date, cycleStartDay);
  const stepCount = Math.max(0, steps || 0);
  for (let i = 0; i < stepCount; i++) {
    cycle = getPreviousCycle(cycle, cycleStartDay);
  }
  return cycle;
};

// Shared by CreditCardBilling's cycle list and DashboardStats' "By Account" drill-down —
// both formatted a [start, end] range identically before this was extracted.
export const formatCycleRange = (start, end) => {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' });
  const endLabel = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
};
