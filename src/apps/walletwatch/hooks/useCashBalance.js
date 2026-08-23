import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { safeGetDate } from '../../../lib/utils';

const APP_ID = 'default-app-id';

/**
 * Sums the net cash movement (Payment Mode = Cash, physical cash-in-hand only — a named
 * `paymentAccount` override is ignored on purpose, since this tracks one wallet, not a
 * ledger of individually-named accounts) strictly after `afterDate` (exclusive) and up to
 * `throughDate` (inclusive). Positive amounts (e.g. a cash reimbursement or a return paid
 * out in cash) increase the balance; negative (spend) decrease it — same signed-amount
 * convention as every other WalletWatch total.
 */
const sumCashFlow = (allExpenses, afterDate, throughDate) => {
  return allExpenses.reduce((sum, e) => {
    if (e.paymentMode !== 'cash') return sum;
    const d = safeGetDate(e.date);
    if (!d) return sum;
    if (afterDate && d <= afterDate) return sum;
    if (throughDate && d > throughDate) return sum;
    return sum + Number(e.amount || 0);
  }, 0);
};

/**
 * WalletWatch Cash Balance tracking — a manual monthly reconciliation ledger, not an
 * auto-computed running total (see CLAUDE.md). Each snapshot records what you actually
 * counted in hand as of a date; `expectedBalance`/`gap` are computed once at save time from
 * the prior snapshot plus logged cash transactions in between, then frozen on the doc so
 * historical entries don't silently drift if later transactions are edited. The gap is
 * where an unlogged cash return/deposit shows up — prompting you to either log it as a
 * transaction or accept the snapshot as the new baseline.
 */
export const useCashBalance = (user, allExpenses, appId = APP_ID) => {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const col = collection(db, 'artifacts', appId, 'users', user.uid, 'cashBalanceSnapshots');
    const unsub = onSnapshot(col, (snapshot) => {
      const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (safeGetDate(b.asOfDate) || 0) - (safeGetDate(a.asOfDate) || 0));
      setSnapshots(rows);
      setLoading(false);
    }, (error) => {
      console.error('Firestore Cash Balance Snapshots Error:', error);
      setLoading(false);
    });
    return () => unsub();
  }, [user, appId]);

  // The most recent snapshot strictly before `date` — the reconciliation anchor for a new
  // or edited snapshot dated `date`.
  const previousSnapshotBefore = (date) => {
    return snapshots
      .filter(s => {
        const d = safeGetDate(s.asOfDate);
        return d && d < date;
      })
      .sort((a, b) => (safeGetDate(b.asOfDate) || 0) - (safeGetDate(a.asOfDate) || 0))[0] || null;
  };

  // Live "as of right now" projection from the latest snapshot (or from zero, if none
  // exist yet) plus cash flow since — shown as a standing indicator even between
  // snapshots, so a gap is visible before you next sit down to count cash.
  const currentExpectedBalance = () => {
    const latest = snapshots[0] || null;
    const baseline = latest ? Number(latest.actualBalance || 0) : 0;
    const baselineDate = latest ? safeGetDate(latest.asOfDate) : null;
    return baseline + sumCashFlow(allExpenses, baselineDate, new Date());
  };

  const computeExpected = (asOfDate, excludeId = null) => {
    const prior = snapshots.filter(s => s.id !== excludeId).length
      ? snapshots.filter(s => s.id !== excludeId)
        .filter(s => { const d = safeGetDate(s.asOfDate); return d && d < asOfDate; })
        .sort((a, b) => (safeGetDate(b.asOfDate) || 0) - (safeGetDate(a.asOfDate) || 0))[0] || null
      : null;
    const baseline = prior ? Number(prior.actualBalance || 0) : null;
    const baselineDate = prior ? safeGetDate(prior.asOfDate) : null;
    // No prior snapshot at all: nothing to reconcile against yet, so the first-ever
    // snapshot just sets the starting point (expected == actual, gap == 0) rather than
    // comparing against an arbitrary zero baseline.
    if (baseline === null) return null;
    return baseline + sumCashFlow(allExpenses, baselineDate, asOfDate);
  };

  const addSnapshot = async ({ asOfDate, actualBalance, note }) => {
    if (!user) return;
    const expected = computeExpected(asOfDate);
    const actual = Number(actualBalance);
    const col = collection(db, 'artifacts', appId, 'users', user.uid, 'cashBalanceSnapshots');
    await addDoc(col, {
      asOfDate: Timestamp.fromDate(asOfDate),
      actualBalance: actual,
      expectedBalance: expected === null ? actual : expected,
      gap: expected === null ? 0 : actual - expected,
      note: note || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const updateSnapshot = async (id, { asOfDate, actualBalance, note }) => {
    if (!user) return;
    const expected = computeExpected(asOfDate, id);
    const actual = Number(actualBalance);
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'cashBalanceSnapshots', id);
    await updateDoc(ref, {
      asOfDate: Timestamp.fromDate(asOfDate),
      actualBalance: actual,
      expectedBalance: expected === null ? actual : expected,
      gap: expected === null ? 0 : actual - expected,
      note: note || '',
      updatedAt: serverTimestamp(),
    });
  };

  const deleteSnapshot = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cashBalanceSnapshots', id));
  };

  return {
    snapshots,
    loading,
    currentExpectedBalance,
    previousSnapshotBefore,
    computeExpected,
    addSnapshot,
    updateSnapshot,
    deleteSnapshot,
  };
};
