import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getAccountKey } from '../constants';
import { safeGetDate, toISODate } from '../../../lib/utils';
import { getCycleForDate, getPreviousCycle, getNextCycle } from '../lib/cardCycles';

const APP_ID = 'default-app-id';
// Caps how far back cyclesForCard walks so a card used once, years ago, doesn't
// generate an unbounded list — 12 statement cycles is a full year of history.
const MAX_CYCLES_BACK = 12;
// Guards the forward walk (prepaid balance rollover) against a runaway loop if
// startingBalanceDate is ever badly misconfigured — 50 years of cycles is far more
// than any real starting date would ever need.
const MAX_FORWARD_CYCLES = 600;

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
 *
 * A card's `cardType` is 'credit' (default, for legacy configs with no cardType field)
 * or 'prepaid'. Prepaid cards are refilled a fixed amount by the company each cycle and
 * never need reconciling against a bank payment, so they skip the settlement flow
 * entirely. Their balance *rolls over* cycle to cycle (unspent money stays on the card,
 * matching how a real prepaid card works) rather than resetting — `cyclesForCard` walks
 * forward from the card's one-time `startingBalance`/`startingBalanceDate` up to the
 * current cycle, applying `+ refillAmount` then `- cardSpend` per cycle in sequence, so
 * each cycle's closing balance becomes the next cycle's opening balance.
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

  const addCard = async (name, cycleStartDay = 1, cardType = 'credit', refillAmount = 0, startingBalance = 0, startingBalanceDate = null) => {
    const trimmed = (name || '').trim();
    if (!trimmed || cards.some(c => c.name === trimmed)) return;
    const type = cardType === 'prepaid' ? 'prepaid' : 'credit';
    await saveCards([...cards, {
      name: trimmed,
      cycleStartDay: Number(cycleStartDay) || 1,
      cardType: type,
      refillAmount: type === 'prepaid' ? (Number(refillAmount) || 0) : 0,
      startingBalance: type === 'prepaid' ? (Number(startingBalance) || 0) : 0,
      // Defaults to today so a card added without an explicit "as of" date still gets a
      // valid anchor for the forward balance walk in cyclesForCard.
      startingBalanceDate: type === 'prepaid' ? (startingBalanceDate || toISODate(new Date())) : null,
    }]);
  };

  // `updates` is a partial object ({ cycleStartDay } and/or { cardType } and/or
  // { refillAmount } and/or { startingBalance }/{ startingBalanceDate }) so the Manage
  // Cards modal can patch one field at a time without needing to know the card's other
  // current values.
  const updateCard = async (name, updates) => {
    await saveCards(cards.map(c => {
      if (c.name !== name) return c;
      const merged = { ...c, ...updates };
      if (updates.cycleStartDay !== undefined) merged.cycleStartDay = Number(updates.cycleStartDay) || 1;
      if (updates.refillAmount !== undefined) merged.refillAmount = Number(updates.refillAmount) || 0;
      if (updates.startingBalance !== undefined) merged.startingBalance = Number(updates.startingBalance) || 0;
      if (updates.cardType !== undefined) merged.cardType = updates.cardType === 'prepaid' ? 'prepaid' : 'credit';
      return merged;
    }));
  };

  const removeCard = async (name) => {
    await saveCards(cards.filter(c => c.name !== name));
  };

  // useCallback so CreditCardBilling.jsx's `useMemo(..., [activeCard, cyclesForCard])`
  // actually memoizes — without a stable identity here, that dependency changes on
  // every render of this hook (e.g. any settlement elsewhere ticking `settlements`),
  // silently defeating the memoization.
  const cyclesForCard = useCallback((cardName) => {
    const card = cards.find(c => c.name === cardName);
    const cycleStartDay = card?.cycleStartDay || 1;
    const cardType = card?.cardType === 'prepaid' ? 'prepaid' : 'credit';
    const cardExpenses = allExpenses.filter(e => e.paymentMode === 'card' && getAccountKey(e) === cardName && Number(e.amount) < 0);

    const spendInCycle = (cyc) => cardExpenses
      .filter(e => {
        const d = safeGetDate(e.date);
        return d && d >= cyc.cycleStart && d <= cyc.cycleEnd;
      })
      .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);

    if (cardType === 'prepaid') {
      const refillAmount = Number(card?.refillAmount) || 0;
      const startingBalance = Number(card?.startingBalance) || 0;
      const startingDate = safeGetDate(card?.startingBalanceDate) || new Date();
      const startCycle = getCycleForDate(startingDate, cycleStartDay);
      const nowCycle = getCycleForDate(new Date(), cycleStartDay);

      // Walk forward from the cycle the starting balance was recorded in, up through the
      // current cycle, applying refill-then-spend in sequence so each cycle's closing
      // balance carries into the next cycle's opening balance (a real prepaid card's
      // unspent money doesn't reset each period).
      const forward = [];
      let openingBalance = startingBalance;
      let fc = startCycle;
      let guard = 0;
      while (guard < MAX_FORWARD_CYCLES) {
        const cardSpend = spendInCycle(fc);
        const balance = openingBalance + refillAmount - cardSpend;
        forward.push({ ...fc, cardType, cardSpend, refillAmount, openingBalance, balance, settlement: null, status: balance < 0 ? 'overspent' : 'ok' });
        if (fc.cycleKey === nowCycle.cycleKey) break;
        openingBalance = balance;
        fc = getNextCycle(fc, cycleStartDay);
        guard++;
      }

      // Most-recent-first, capped the same as the credit-card walk-back below.
      return forward.slice(-MAX_CYCLES_BACK).reverse();
    }

    let cycle = getCycleForDate(new Date(), cycleStartDay);
    const result = [];

    for (let i = 0; i < MAX_CYCLES_BACK; i++) {
      const cardSpend = spendInCycle(cycle);
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

      result.push({ ...cycle, cardType, cardSpend, settlement, status });
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
