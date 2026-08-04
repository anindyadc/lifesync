import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getAccountKey } from '../constants';
import { safeGetDate } from '../../../lib/utils';
import { getCycleForDate, getPreviousCycle } from '../lib/cardCycles';

const APP_ID = 'default-app-id';
// Caps how far back cyclesForCard walks so a card used once, years ago, doesn't
// generate an unbounded list — 12 statement cycles is a full year of history.
const MAX_CYCLES_BACK = 12;

/**
 * WalletWatch Credit Card billing-cycle tally. Each card's actual statement period
 * (which may not align to the calendar month) is configured once in
 * `settings/creditCardConfig`; cumulative spend per cycle is always computed live from
 * `expenses` (never stored), so it stays accurate if past transactions are later edited.
 *
 * Settling a cycle (`settleCycle`) deliberately does NOT create a new `expenses` doc —
 * each card purchase was already counted once as spend when it was logged individually,
 * so the lump-sum bank payment is a liability settlement, not new spend. It's recorded
 * purely in `cardCycleSettlements` and shown only in the Cards tab; History, the
 * Dashboard "Total Spent" KPI, and exports are entirely unaffected.
 */
export const useCreditCards = (user, allExpenses = [], appId = APP_ID) => {
  const [cards, setCards] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [settlementsLoaded, setSettlementsLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'creditCardConfig');
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
      setCards(docSnap.exists() ? (docSnap.data().cards || []) : []);
      setCardsLoaded(true);
    }, (error) => {
      console.error('Firestore Credit Card Config Error:', error);
      setCardsLoaded(true);
    });

    const settlementsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'cardCycleSettlements');
    const unsubSettlements = onSnapshot(settlementsCol, (snapshot) => {
      setSettlements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setSettlementsLoaded(true);
    }, (error) => {
      console.error('Firestore Card Cycle Settlements Error:', error);
      setSettlementsLoaded(true);
    });

    return () => { unsubConfig(); unsubSettlements(); };
  }, [user, appId]);

  const saveCards = async (updated) => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'creditCardConfig');
    await setDoc(configRef, { cards: updated }, { merge: true });
  };

  const addCard = async (name, cycleStartDay = 1) => {
    const trimmed = (name || '').trim();
    if (!trimmed || cards.some(c => c.name === trimmed)) return;
    await saveCards([...cards, { name: trimmed, cycleStartDay: Number(cycleStartDay) || 1 }]);
  };

  const updateCard = async (name, cycleStartDay) => {
    await saveCards(cards.map(c => (c.name === name ? { ...c, cycleStartDay: Number(cycleStartDay) || 1 } : c)));
  };

  const removeCard = async (name) => {
    await saveCards(cards.filter(c => c.name !== name));
  };

  // useCallback so CreditCardBilling.jsx's `useMemo(..., [activeCard, cyclesForCard])`
  // actually memoizes — without a stable identity here, that dependency changes on
  // every render of this hook (e.g. any settlement elsewhere ticking `settlements`),
  // silently defeating the memoization.
  const cyclesForCard = useCallback((cardName) => {
    const cycleStartDay = cards.find(c => c.name === cardName)?.cycleStartDay || 1;
    const cardExpenses = allExpenses.filter(e => e.paymentMode === 'card' && getAccountKey(e) === cardName && Number(e.amount) < 0);

    let cycle = getCycleForDate(new Date(), cycleStartDay);
    const result = [];

    for (let i = 0; i < MAX_CYCLES_BACK; i++) {
      const cardSpend = cardExpenses
        .filter(e => {
          const d = safeGetDate(e.date);
          return d && d >= cycle.cycleStart && d <= cycle.cycleEnd;
        })
        .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);

      const settlement = settlements.find(s => s.cardName === cardName && s.cycleKey === cycle.cycleKey) || null;

      // Always show the current cycle even if empty (so a freshly-configured card isn't
      // blank); stop walking further back once a cycle has neither spend nor a settlement.
      if (i > 0 && cardSpend === 0 && !settlement) break;

      let status = 'unsettled';
      if (settlement) {
        const diff = Math.round((Number(settlement.paidAmount) - cardSpend) * 100) / 100;
        status = diff === 0 ? 'settled' : diff < 0 ? 'short' : 'over';
      } else if (cycle.cycleEnd < new Date()) {
        // Distinguishes "still accumulating in the open cycle" from "statement closed,
        // payment now actually expected" — same Overdue-once-past-the-window idea as
        // Fixed Expenses' status chip.
        status = 'overdue';
      }

      result.push({ ...cycle, cardSpend, settlement, status });
      cycle = getPreviousCycle(cycle, cycleStartDay);
    }

    return result;
  }, [cards, allExpenses, settlements]);

  const settleCycle = async (cardName, cycle, { paidAmount, paidDate, paymentMode, paymentAccount, note }) => {
    if (!user) return;
    const [year, month, day] = paidDate.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    const payload = {
      cardName,
      cycleKey: cycle.cycleKey,
      cycleStart: Timestamp.fromDate(cycle.cycleStart),
      cycleEnd: Timestamp.fromDate(cycle.cycleEnd),
      paidAmount: Number(paidAmount),
      paidDate: Timestamp.fromDate(localDate),
      paymentMode: paymentMode || 'upi',
      paymentAccount: paymentAccount || null,
      note: note || null,
      settledAt: serverTimestamp(),
    };

    // Deterministic doc ID (cardName+cycleKey, slugified since a card name is free
    // text and Firestore doc IDs can't contain '/') instead of an existing-doc lookup +
    // addDoc — makes settling idempotent so two tabs/devices settling the same cycle at
    // the same instant land on one doc instead of creating duplicate settlement records.
    const slug = cardName.trim().replace(/[^a-zA-Z0-9]+/g, '-');
    const settlementRef = doc(db, 'artifacts', appId, 'users', user.uid, 'cardCycleSettlements', `${slug}_${cycle.cycleKey}`);
    await setDoc(settlementRef, payload);
  };

  const deleteSettlement = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cardCycleSettlements', id));
  };

  const loading = !cardsLoaded || !settlementsLoaded;

  return { cards, settlements, loading, addCard, updateCard, removeCard, cyclesForCard, settleCycle, deleteSettlement };
};
