// Indian financial year: April 1 -> March 31. Callers pass in already-resolved
// Date objects (e.g. via the shared safeGetDate helper), so this file stays a
// plain date-math module with no Firestore/string-parsing concerns of its own.

// e.g. a date of 2026-01-15 -> "2025-26"; a date of 2026-05-01 -> "2026-27"
export const getFYLabel = (date) => {
  const y = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? y : y - 1; // April = month index 3
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
};

export const getFYBounds = (fyLabel) => {
  const startYear = parseInt(fyLabel.split('-')[0], 10);
  return {
    start: new Date(startYear, 3, 1), // Apr 1
    end: new Date(startYear + 1, 2, 31, 23, 59, 59, 999), // Mar 31
  };
};

export const getCurrentFYLabel = () => getFYLabel(new Date());

// Financial years strictly between (or touching) two dates, inclusive, oldest first.
export const fyRangeBetween = (fromDate, toDate) => {
  if (!fromDate || !toDate) return [];
  const labels = [];
  let cursor = getFYBounds(getFYLabel(fromDate)).start;
  const endLabel = getFYLabel(toDate);
  const endBounds = getFYBounds(endLabel);
  while (cursor <= endBounds.start) {
    labels.push(getFYLabel(cursor));
    cursor = new Date(cursor.getFullYear() + 1, 3, 1);
  }
  return labels;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Simple-interest accrual for `principal` at `ratePct`% p.a., apportioned to whatever
// part of [startDate, endDate] overlaps the given financial year. This is an estimate
// (simple interest, not the bank's actual compounding schedule) — good enough to see
// which FY interest income lands in, not a substitute for the bank's interest certificate.
//
// `periodsPerYear` is the compounding frequency (4 = quarterly, 1 = yearly...);
// 0/undefined means simple interest. With compounding, interest in an FY is the
// growth of the deposit's value across that FY's overlap with its life.
export const valueAfterYears = (principal, ratePct, years, periodsPerYear) => {
  if (!periodsPerYear) return principal * (1 + (ratePct / 100) * years);
  return principal * Math.pow(1 + ratePct / 100 / periodsPerYear, periodsPerYear * years);
};

export const fdInterestForFY = (principal, ratePct, startDate, endDate, fyLabel, periodsPerYear = 0) => {
  if (!principal || !ratePct || !startDate || !endDate) return 0;
  const { start: fyStart, end: fyEnd } = getFYBounds(fyLabel);
  const overlapStart = startDate > fyStart ? startDate : fyStart;
  const overlapEnd = endDate < fyEnd ? endDate : fyEnd;
  if (overlapStart > overlapEnd) return 0;
  // Years elapsed since the deposit began, at the start and end of the overlap.
  const yearsAt = (d) => Math.max(0, (d - startDate) / DAY_MS) / 365;
  const from = yearsAt(overlapStart);
  const to = (Math.round((overlapEnd - startDate) / DAY_MS) + 1) / 365;
  return valueAfterYears(principal, ratePct, to, periodsPerYear) - valueAfterYears(principal, ratePct, from, periodsPerYear);
};

// Estimated total value at maturity — shown in the form as a sanity check against
// the maturity amount printed on the receipt/certificate.
export const estimateMaturityValue = (principal, ratePct, startDate, endDate, periodsPerYear = 0) => {
  if (!principal || !ratePct || !startDate || !endDate || endDate <= startDate) return null;
  const years = (endDate - startDate) / DAY_MS / 365;
  return valueAfterYears(principal, ratePct, years, periodsPerYear);
};

// India's equity/equity-fund LTCG threshold: holding period of 12 months or more.
// Debt-category funds (units bought on/after 1 Apr 2023) are taxed at slab rate with
// no STCG/LTCG split, so they're classified 'SLAB'.
export const classifyGain = (purchaseDate, saleDate, fundCategory = 'equity') => {
  if (fundCategory === 'debt') return 'SLAB';
  const days = Math.round((saleDate - purchaseDate) / DAY_MS);
  return days >= 365 ? 'LTCG' : 'STCG';
};
