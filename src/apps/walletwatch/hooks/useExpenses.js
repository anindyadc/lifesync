import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { safeGetDate } from '../../../lib/utils';
import { DEFAULT_CATEGORIES, getCategoryColor } from '../constants';

export const useExpenses = (user, appId = 'default-app-id', selectedMonth = null) => {
  const [allExpenses, setAllExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen to Expenses
    const qExp = collection(db, 'artifacts', appId, 'users', user.uid, 'expenses');
    const unsubExp = onSnapshot(qExp, (snapshot) => {
      // safeGetDate (not a raw `.date.toDate()`) so one doc with a missing/malformed
      // date can't throw mid-sort and take down the entire transaction list.
      const sortedExpenses = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (safeGetDate(b.date) || 0) - (safeGetDate(a.date) || 0));
      setAllExpenses(sortedExpenses);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Expenses Error:", error);
      setLoading(false);
    });

    // Listen to Categories
    const catRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'walletConfig');
    const unsubCat = onSnapshot(catRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().categories) {
        setCategories(docSnap.data().categories);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    }, (error) => {
      console.error("Firestore Categories Error:", error);
    });

    return () => { unsubExp(); unsubCat(); };
  }, [user, appId]);

  const expenses = useMemo(() => {
    if (!selectedMonth) return allExpenses;
    return allExpenses.filter(exp => {
      const expDate = safeGetDate(exp.date);
      return expDate &&
             expDate.getMonth() === selectedMonth.getMonth() &&
             expDate.getFullYear() === selectedMonth.getFullYear();
    });
  }, [selectedMonth, allExpenses]);

  const addCategory = async (label) => {
    const trimmed = (label || '').trim();
    if (!trimmed || !user) return;

    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `cat-${Date.now()}`;
    if (categories.some(c => c.id === id)) return;

    const { color, bg } = getCategoryColor(categories.length);
    const updated = [...categories, { id, label: trimmed, color, bg }];

    const catRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'walletConfig');
    await setDoc(catRef, { categories: updated }, { merge: true });
  };

  const removeCategory = async (id) => {
    if (!user) return;
    const updated = categories.filter(c => c.id !== id);

    const catRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'walletConfig');
    await setDoc(catRef, { categories: updated }, { merge: true });
  };

  return { expenses, allExpenses, categories, loading, addCategory, removeCategory };
};
