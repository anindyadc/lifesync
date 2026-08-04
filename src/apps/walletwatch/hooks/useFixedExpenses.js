import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const APP_ID = 'default-app-id';

export const monthKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Clamps a target day-of-month (1-31) to the actual last day of that month, e.g.
// periodStartDay=31 in February resolves to the 28th/29th instead of overflowing.
export const clampDayToMonth = (year, month, day) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(1, day), lastDay);
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
    const monthKey = monthKeyOf(today);
    const todayDay = today.getDate();

    templates.forEach(async (tpl) => {
      if (!tpl.active) return;
      if (todayDay < tpl.periodStartDay) return;

      const dedupeKey = `${tpl.id}|${monthKey}`;
      if (generatingRef.current.has(dedupeKey)) return;
      const alreadyExists = instances.some(inst => inst.templateId === tpl.id && inst.monthKey === monthKey);
      if (alreadyExists) return;

      generatingRef.current.add(dedupeKey);

      const year = today.getFullYear();
      const month = today.getMonth();
      const startDay = clampDayToMonth(year, month, tpl.periodStartDay);
      const endDay = clampDayToMonth(year, month, tpl.periodEndDay);

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
      periodEndDay: Number(data.periodEndDay),
      active: data.active !== false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const updateTemplate = async (id, data) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseTemplates', id);
    await updateDoc(ref, {
      label: data.label,
      amount: Number(data.amount),
      category: data.category,
      paymentMode: data.paymentMode || null,
      paymentAccount: data.paymentAccount || null,
      isOfficial: !!data.isOfficial,
      periodStartDay: Number(data.periodStartDay),
      periodEndDay: Number(data.periodEndDay),
      active: data.active !== false,
      updatedAt: serverTimestamp(),
    });
  };

  const toggleTemplateActive = async (id, active) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseTemplates', id);
    await updateDoc(ref, { active, updatedAt: serverTimestamp() });
  };

  const deleteTemplate = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'fixedExpenseTemplates', id));
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

  const loading = !templatesLoaded || !instancesLoaded;

  return {
    templates,
    instances,
    loading,
    addTemplate,
    updateTemplate,
    toggleTemplateActive,
    deleteTemplate,
    markPaid,
    skipInstance,
    deleteInstance,
  };
};
