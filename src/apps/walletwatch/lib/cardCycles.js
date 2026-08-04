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
