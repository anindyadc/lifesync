import { useState, useEffect } from 'react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase'; // Adjust path based on your folder structure

const APP_ID = 'default-app-id'; // Or import from a config file

export const useExpenses = (user) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Firestore Listener
    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by Date Descending
      data.sort((a, b) => {
        const dateA = a.date && typeof a.date.toDate === 'function' ? a.date.toDate() : new Date(a.date);
        const dateB = b.date && typeof b.date.toDate === 'function' ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      
      setExpenses(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Actions
  const addExpense = async (data) => {
    const dateObj = new Date(data.date);
    // Preserve current time to avoid timezone shifts
    const now = new Date();
    dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses'), {
      ...data,
      amount: parseFloat(data.amount),
      date: Timestamp.fromDate(dateObj),
      createdAt: serverTimestamp()
    });
  };

  const updateExpense = async (id, data) => {
    const dateObj = new Date(data.date);
    const now = new Date();
    dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const expenseRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses', id);
    await updateDoc(expenseRef, {
      ...data,
      amount: parseFloat(data.amount),
      date: Timestamp.fromDate(dateObj),
      updatedAt: serverTimestamp()
    });
  };

  const deleteExpense = async (id) => {
    const expenseRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses', id);
    await deleteDoc(expenseRef);
  };

  return { expenses, loading, addExpense, updateExpense, deleteExpense };
};