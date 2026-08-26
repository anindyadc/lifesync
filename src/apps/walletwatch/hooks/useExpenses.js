import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { safeGetDate } from '../../../lib/utils';
import { DEFAULT_CATEGORIES, getCategoryColor, getTopLevelCategories, getChildCategories } from '../constants';

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

  const addCategory = async (label, parentId = null) => {
    const trimmed = (label || '').trim();
    if (!trimmed || !user) return;

    let parent = null;
    if (parentId) {
      parent = categories.find(c => c.id === parentId);
      if (!parent) throw new Error('That parent category no longer exists.');
      if (parent.parentId) throw new Error('Subcategories can only be two levels deep.');
    }

    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const id = parentId
      ? `${parentId}-${slug || `cat-${Date.now()}`}`
      : (slug || `cat-${Date.now()}`);
    if (categories.some(c => c.id === id)) {
      throw new Error(`A category with a similar name already exists.`);
    }

    // Children inherit the parent's color/icon slot instead of consuming a new one, so a
    // subcategory always reads as visually part of its parent; only top-level categories
    // rotate through the palette, keyed off the top-level count so nesting children never
    // skews later top-level colors.
    const { color, bg } = parent
      ? { color: parent.color, bg: parent.bg }
      : getCategoryColor(getTopLevelCategories(categories).length);
    const newCat = { id, label: trimmed, color, bg, ...(parentId ? { parentId } : {}) };
    const updated = [...categories, newCat];

    const catRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'walletConfig');
    await setDoc(catRef, { categories: updated }, { merge: true });
  };

  const updateCategory = async (id, newLabel) => {
    const trimmed = (newLabel || '').trim();
    if (!trimmed || !user) return;
    const updated = categories.map(c => c.id === id ? { ...c, label: trimmed } : c);

    const catRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'walletConfig');
    await setDoc(catRef, { categories: updated }, { merge: true });
  };

  const removeCategory = async (id) => {
    if (!user) return;
    // Deleting a top-level category cascades to its children too — a subcategory left
    // pointing at a parentId that no longer exists would just be a dangling reference
    // nothing else in the app resolves.
    const childIds = new Set(getChildCategories(categories, id).map(c => c.id));
    const updated = categories.filter(c => c.id !== id && !childIds.has(c.id));

    const catRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'walletConfig');
    await setDoc(catRef, { categories: updated }, { merge: true });
  };

  return { expenses, allExpenses, categories, loading, addCategory, updateCategory, removeCategory };
};
