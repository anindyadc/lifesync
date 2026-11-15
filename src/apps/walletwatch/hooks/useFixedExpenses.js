import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, deleteField, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const APP_ID = 'default-app-id';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const monthKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Clamps a target day-of-month (1-31) to the actual last day of that month, e.g.
// periodStartDay=31 in February resolves to the 28th/29th instead of overflowing.
export const clampDayToMonth = (year, month, day) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(1, day), lastDay);
};

// An instance's `dueEnd` is stored as midnight at the START of its last due day, so a plain
// `now > dueEnd` flips to overdue at 00:00 on that day. A bill is only overdue once that
// whole day has passed, so compare against the end of the day instead.
export const isPastDue = (dueEnd, now = new Date()) => {
  if (!dueEnd) return false;
  const endOfDay = new Date(dueEnd.getFullYear(), dueEnd.getMonth(), dueEnd.getDate() + 1);
  return now >= endOfDay;
};

/**
 * WalletWatch Fixed Expenses (recurring bills).
 *
 * Two collections: `fixedExpenseTemplates` (the recurring definition, e.g. "Rent, ₹15000,
 * due days 1-5") and `fixedExpenseInstances` (one per template per month, generated
 * on-demand below). An instance only becomes a real transaction — via markPaid, which
 * writes into the normal `expenses` collection — once the user explicitly pays it; an
 * unpaid instance never touches History/Dashboard totals/exports.
 *
 * There's no Cloud Function / cron in this repo (Spark plan only, see CLAUDE.md), so
 * generation is a client-side check that runs whenever this hook mounts, i.e. whenever
 * the user opens WalletWatch — same spirit as MediWatch's smart-archiving-on-write.
 */
export const useFixedExpenses = (user, appId = APP_ID) => {
  const [templates, setTemplates] = useState([]);
  const [instances, setInstances] = useState([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [instancesLoaded, setInstancesLoaded] = useState(false);

  // Dedupe key set for instances generated this session, so the generation effect
  // below doesn't fire a second addDoc for the same (templateId, monthKey) while
  // waiting for Firestore's onSnapshot to echo the first write back.
  const generatingRef = useRef(new Set());

  useEffect(() => {
    if (!user) return;

    const templatesCol = collection(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseTemplates');
    const unsubTemplates = onSnapshot(templatesCol, (snapshot) => {
      const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.label || '').localeCompare(b.label || ''));
      setTemplates(rows);
      setTemplatesLoaded(true);
    }, (error) => {
      console.error('Firestore Fixed Expense Templates Error:', error);
      setTemplatesLoaded(true);
    });

    const instancesCol = collection(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseInstances');
    const unsubInstances = onSnapshot(instancesCol, (snapshot) => {
      const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.monthKey || '').localeCompare(a.monthKey || ''));
      setInstances(rows);
      setInstancesLoaded(true);
    }, (error) => {
      console.error('Firestore Fixed Expense Instances Error:', error);
      setInstancesLoaded(true);
    });

    return () => { unsubTemplates(); unsubInstances(); };
  }, [user, appId]);

  // Generation: once both collections have loaded, create this month's instance for
  // every active template whose period has opened (today's day-of-month >= periodStartDay)
  // and that doesn't already have one. Only ever creates instances for the current month —
  // past unpaid instances are left exactly as they are, so a forgotten bill stays visible.
  useEffect(() => {
    if (!user || !templatesLoaded || !instancesLoaded) return;

    const today = new Date();
    const currentKey = monthKeyOf(today);
    const todayDay = today.getDate();

    // Catch-up: the app can go unopened for weeks, and instances are only ever created when it
    // runs, so every month since the bill began (an auto-pay template: since auto-pay was
    // switched on) is generated here, not just the current one — missed months then show up as
    // unpaid "Also unpaid" rows to Pay/Skip with the right date. Capped at a year back.
    const MAX_BACKFILL_MONTHS = 12;
    const lowerBoundOf = (tpl) => {
      if (tpl.autoPay && tpl.autoPayStart) return new Date(`${tpl.autoPayStart}T00:00:00`);
      return tpl.createdAt?.toDate ? tpl.createdAt.toDate() : null;
    };
    const monthsFor = (tpl) => {
      const months = [];
      const since = lowerBoundOf(tpl);
      const floor = new Date(today.getFullYear(), today.getMonth() - MAX_BACKFILL_MONTHS, 1);
      let cursor = since && !isNaN(since)
        ? new Date(Math.max(new Date(since.getFullYear(), since.getMonth(), 1), floor))
        : new Date(today.getFullYear(), today.getMonth(), 1);
      while (cursor.getFullYear() < today.getFullYear() || (cursor.getFullYear() === today.getFullYear() && cursor.getMonth() <= today.getMonth())) {
        months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
      return months;
    };

    templates.forEach((tpl) => {
      if (!tpl.active) return;
      monthsFor(tpl).forEach(async ({ year, month }) => {
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const isCurrent = monthKey === currentKey;
      if (isCurrent && todayDay < tpl.periodStartDay) return;

      const startDay = clampDayToMonth(year, month, tpl.periodStartDay);
      const endDay = clampDayToMonth(year, month, tpl.periodEndDay);
      // Don't invent bills for periods that ended before this template (or auto-pay) existed.
      const lowerBound = lowerBoundOf(tpl);
      if (lowerBound && !isNaN(lowerBound)) {
        const relevantDay = tpl.autoPay ? startDay : endDay;
        if (new Date(year, month, relevantDay, 23, 59, 59) < lowerBound) return;
      }

      const dedupeKey = `${tpl.id}|${monthKey}`;
      if (generatingRef.current.has(dedupeKey)) return;
      const alreadyExists = instances.some(inst => inst.templateId === tpl.id && inst.monthKey === monthKey);
      if (alreadyExists) return;

      generatingRef.current.add(dedupeKey);

      try {
        // Deterministic doc ID (rather than addDoc's random one) makes this write
        // idempotent: if two tabs/devices both pass the "does it exist" check above in
        // the same instant (before either write echoes back via onSnapshot), they both
        // land on the same doc instead of creating two duplicate pending instances.
        const instanceRef = doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseInstances', `${tpl.id}_${monthKey}`);
        await setDoc(instanceRef, {
          templateId: tpl.id,
          monthKey,
          label: tpl.label,
          amount: tpl.amount,
          category: tpl.category,
          paymentMode: tpl.paymentMode || null,
          paymentAccount: tpl.paymentAccount || null,
          isOfficial: !!tpl.isOfficial,
          autoPay: !!tpl.autoPay,
          dueStart: Timestamp.fromDate(new Date(year, month, startDay)),
          dueEnd: Timestamp.fromDate(new Date(year, month, endDay)),
          status: 'pending',
          paidExpenseId: null,
          paidDate: null,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Fixed Expense Instance Generation Error:', error);
        generatingRef.current.delete(dedupeKey);
      }
      });
    });
  }, [user, appId, templates, instances, templatesLoaded, instancesLoaded]);

  // Sync: an instance copies its template's due window, amount, label etc. at the moment it's
  // generated, so editing a template (e.g. moving the due day later) never reached an
  // already-generated pending instance — it kept its old dueEnd and stayed "Overdue". Keep
  // every still-pending instance in line with its template; paid/skipped ones are history
  // and are left alone. The ref stops a repeat write while the snapshot is catching up.
  const syncedRef = useRef(new Map());
  useEffect(() => {
    if (!user || !templatesLoaded || !instancesLoaded) return;

    instances.forEach(async (inst) => {
      if (inst.status !== 'pending' || !inst.monthKey) return;
      const tpl = templates.find(t => t.id === inst.templateId);
      if (!tpl) return;

      const [year, monthNum] = inst.monthKey.split('-').map(Number);
      const month = monthNum - 1;
      const dueStart = new Date(year, month, clampDayToMonth(year, month, tpl.periodStartDay));
      const dueEnd = new Date(year, month, clampDayToMonth(year, month, tpl.periodEndDay));

      const desired = {
        label: tpl.label,
        amount: tpl.amount,
        category: tpl.category,
        paymentMode: tpl.paymentMode || null,
        paymentAccount: tpl.paymentAccount || null,
        isOfficial: !!tpl.isOfficial,
        autoPay: !!tpl.autoPay,
      };
      const sameDay = (ts, d) => ts?.toMillis && ts.toMillis() === d.getTime();
      const inSync = sameDay(inst.dueStart, dueStart) && sameDay(inst.dueEnd, dueEnd) &&
        Object.entries(desired).every(([k, v]) => (k === 'autoPay' ? !!inst[k] === v : (inst[k] ?? null) === (v ?? null)));
      if (inSync) return;

      const key = `${inst.id}|${dueStart.getTime()}|${dueEnd.getTime()}|${JSON.stringify(desired)}`;
      if (syncedRef.current.get(inst.id) === key) return;
      syncedRef.current.set(inst.id, key);

      try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseInstances', inst.id), {
          ...desired,
          dueStart: Timestamp.fromDate(dueStart),
          dueEnd: Timestamp.fromDate(dueEnd),
        });
      } catch (error) {
        console.error('Fixed Expense Instance Sync Error:', error);
        syncedRef.current.delete(inst.id);
      }
    });
  }, [user, appId, templates, instances, templatesLoaded, instancesLoaded]);

  // Auto-pay: once an auto-pay instance's debit day has arrived, record the expense and mark
  // the bill paid without any click. Runs on mount like the generation above (no cron on the
  // Spark plan), but dates the expense to the debit day itself, not "today". The expense gets a
  // deterministic id so two tabs/devices racing here write the same document, not two.
  const autoPaidRef = useRef(new Set());
  useEffect(() => {
    if (!user || !templatesLoaded || !instancesLoaded) return;
    const now = new Date();

    instances.forEach(async (inst) => {
      if (inst.status !== 'pending' || !inst.autoPay) return;
      const tpl = templates.find(t => t.id === inst.templateId);
      if (!tpl || !tpl.active || !tpl.autoPay) return;
      const debit = inst.dueStart?.toDate ? inst.dueStart.toDate() : null;
      if (!debit || debit > now) return;
      if (tpl.autoPayStart && debit < new Date(`${tpl.autoPayStart}T00:00:00`)) return;
      if (autoPaidRef.current.has(inst.id)) return;
      autoPaidRef.current.add(inst.id);

      try {
        const base = ['artifacts', appId, 'users', user.uid];
        const expenseRef = doc(db, ...base, 'expenses', `autopay_${inst.id}`);
        const batch = writeBatch(db);
        batch.set(expenseRef, {
          description: inst.label,
          amount: -Math.abs(Number(inst.amount)),
          category: inst.category,
          paymentMode: inst.paymentMode || 'upi',
          paymentAccount: inst.paymentAccount || '',
          isOfficial: !!inst.isOfficial,
          isFixedExpense: true,
          isAutoPaid: true,
          fixedExpenseTemplateId: inst.templateId,
          fixedExpenseInstanceId: inst.id,
          date: Timestamp.fromDate(new Date(debit.getFullYear(), debit.getMonth(), debit.getDate())),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, ...base, 'fixedExpenseInstances', inst.id), {
          status: 'paid',
          paidExpenseId: expenseRef.id,
          paidDate: Timestamp.fromDate(new Date(debit.getFullYear(), debit.getMonth(), debit.getDate())),
        });
        await batch.commit();
      } catch (error) {
        console.error('Fixed Expense Auto-pay Error:', error);
        autoPaidRef.current.delete(inst.id);
      }
    });
  }, [user, appId, templates, instances, templatesLoaded, instancesLoaded]);

  const addTemplate = async (data) => {
    if (!user) return;
    const templatesCol = collection(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseTemplates');
    await addDoc(templatesCol, {
      label: data.label,
      amount: Number(data.amount),
      category: data.category,
      paymentMode: data.paymentMode || null,
      paymentAccount: data.paymentAccount || null,
      isOfficial: !!data.isOfficial,
      periodStartDay: Number(data.periodStartDay),
      periodEndDay: Number(data.autoPay ? data.periodStartDay : data.periodEndDay),
      autoPay: !!data.autoPay,
      ...(data.autoPay ? { autoPayStart: todayISO() } : {}),
      active: data.active !== false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const updateTemplate = async (id, data) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseTemplates', id);
    const existing = templates.find(t => t.id === id);
    await updateDoc(ref, {
      label: data.label,
      amount: Number(data.amount),
      category: data.category,
      paymentMode: data.paymentMode || null,
      paymentAccount: data.paymentAccount || null,
      isOfficial: !!data.isOfficial,
      periodStartDay: Number(data.periodStartDay),
      periodEndDay: Number(data.autoPay ? data.periodStartDay : data.periodEndDay),
      autoPay: !!data.autoPay,
      // Keep the original switch-on date while auto-pay stays on; reset it when turned (back) on.
      autoPayStart: !data.autoPay ? deleteField() : (existing?.autoPay && existing.autoPayStart ? existing.autoPayStart : todayISO()),
      active: data.active !== false,
      // Re-activating through the edit form also lifts a previous Stop.
      ...(data.active !== false ? { stopped: false, stoppedAt: deleteField() } : {}),
      updatedAt: serverTimestamp(),
    });
  };

  const toggleTemplateActive = async (id, active) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseTemplates', id);
    // Resuming (including Restart after a Stop) clears the stopped flag.
    await updateDoc(ref, { active, ...(active ? { stopped: false, stoppedAt: deleteField() } : {}), updatedAt: serverTimestamp() });
  };

  // Permanently ends a bill that is no longer needed (cancelled subscription, loan fully
  // repaid...) without losing it: the template stays, flagged `stopped`, so its Payment
  // History survives and it can be restarted. Unlike Pause, any still-pending instances are
  // cancelled (marked 'skipped') in the same batch so they stop showing as due/overdue.
  // Paid instances and their linked expenses are untouched.
  const stopTemplate = async (id) => {
    if (!user) return;
    const batch = writeBatch(db);
    instances
      .filter(i => i.templateId === id && i.status === 'pending')
      .forEach(i => batch.update(doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseInstances', i.id), { status: 'skipped' }));
    batch.update(doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseTemplates', id), {
      active: false,
      stopped: true,
      stoppedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  };

  // Also removes the template's still-pending instances: with the template gone nothing
  // can render them, so they'd sit in Firestore as orphans nobody can pay or skip. Paid and
  // skipped instances are kept (paid ones are what the linked History expenses point at).
  const deleteTemplate = async (id) => {
    if (!user) return;
    const batch = writeBatch(db);
    instances
      .filter(i => i.templateId === id && i.status === 'pending')
      .forEach(i => batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseInstances', i.id)));
    batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseTemplates', id));
    await batch.commit();
  };

  const skipInstance = async (id) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseInstances', id);
    await updateDoc(ref, { status: 'skipped' });
  };

  const deleteInstance = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseInstances', id));
  };

  // Pays a due instance: writes a normal transaction into `expenses` (same
  // sign-normalization as WalletWatchApp.handleSave), tagged back to the template/instance
  // for the History "Fixed" badge, then flips the instance to 'paid'.
  const markPaid = async (instance, overrides = {}) => {
    if (!user) return;

    const amount = overrides.amount !== undefined ? Number(overrides.amount) : Number(instance.amount);
    const dateInput = overrides.date || new Date();
    const [year, month, day] = typeof dateInput === 'string'
      ? dateInput.split('-').map(Number)
      : [dateInput.getFullYear(), dateInput.getMonth() + 1, dateInput.getDate()];
    const localDate = new Date(year, month - 1, day);

    const expensesCol = collection(db, 'artifacts', appId, 'users', user.uid, 'expenses');
    const expenseDoc = await addDoc(expensesCol, {
      description: instance.label,
      amount: -Math.abs(amount),
      category: instance.category,
      paymentMode: overrides.paymentMode || instance.paymentMode || 'upi',
      paymentAccount: overrides.paymentAccount || instance.paymentAccount || '',
      isOfficial: !!instance.isOfficial,
      isFixedExpense: true,
      fixedExpenseTemplateId: instance.templateId,
      fixedExpenseInstanceId: instance.id,
      date: Timestamp.fromDate(localDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const instanceRef = doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseInstances', instance.id);
    await updateDoc(instanceRef, {
      status: 'paid',
      paidExpenseId: expenseDoc.id,
      paidDate: Timestamp.fromDate(localDate),
    });
  };

  // Instances whose template no longer exists (e.g. left behind by a delete + re-add before
  // deleteTemplate cascaded) can't be shown, paid or skipped from any card, so exclude them
  // from everything the UI counts — otherwise they inflate "Pending & Overdue" invisibly.
  const liveInstances = useMemo(() => {
    const ids = new Set(templates.map(t => t.id));
    return instances.filter(i => ids.has(i.templateId));
  }, [templates, instances]);

  const loading = !templatesLoaded || !instancesLoaded;

  return {
    templates,
    instances: liveInstances,
    loading,
    addTemplate,
    updateTemplate,
    toggleTemplateActive,
    stopTemplate,
    deleteTemplate,
    markPaid,
    skipInstance,
    deleteInstance,
  };
};
