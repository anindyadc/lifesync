import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { DEFAULT_CATEGORIES } from '../constants';

export const useExpenses = (user, appId = 'default-app-id') => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // 1. Listen to Expenses
    const qExp = collection(db, 'artifacts', appId, 'users', user.uid, 'expenses');
    const unsubExp = onSnapshot(qExp, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Firestore Expenses Error:", error);
      setLoading(false);
    });

    // 2. Listen to Custom Categories in Settings
    const catRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'walletConfig');
    const unsubCat = onSnapshot(catRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().categories) {
        console.log("Categories from Firestore:", docSnap.data().categories); // DEBUG
        setCategories(docSnap.data().categories);
      } else {
        console.log("Using DEFAULT_CATEGORIES:", DEFAULT_CATEGORIES); // DEBUG
        setCategories(DEFAULT_CATEGORIES);
      }
    }, (error) => {
      console.error("Firestore Categories Error:", error);
    });

    return () => { unsubExp(); unsubCat(); };
  }, [user, appId]);

  const addCategory = async (label) => {
    if (!label.trim()) return;
    const id = label.toLowerCase().replace(/\s+/g, '_');
    if (categories.some(c => c.id === id)) return;
    
    const newCat = { 
      id, 
      label, 
      color: '#6366f1', 
      bg: 'bg-indigo-100 text-indigo-600' 
    };
    
    const updated = [...categories, newCat];
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'walletConfig'), {
      categories: updated
    }, { merge: true });
  };

  const removeCategory = async (id) => {
    // Prevent removing core categories if needed, or allow all
    const updated = categories.filter(c => c.id !== id);
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'walletConfig'), {
      categories: updated
    }, { merge: true });
  };

  return { expenses, categories, loading, addCategory, removeCategory };
};
