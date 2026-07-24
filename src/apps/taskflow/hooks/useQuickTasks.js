import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const APP_ID = 'default-app-id';

// Lightweight "today/tomorrow" checklist, separate from planned tasks with subtasks.
// `forDate` ('YYYY-MM-DD') is fixed at creation; QuickList derives the Overdue/Today/
// Tomorrow bucket at render time by comparing it to the current date, so an item made
// for "tomorrow" automatically becomes "today" once the day rolls over.
export const useQuickTasks = (user) => {
  const [quickTasks, setQuickTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'quickTasks');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setQuickTasks(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addQuickTask = async ({ title, forDate }) => {
    const trimmed = (title || '').trim();
    if (!trimmed || !user) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'quickTasks'), {
      title: trimmed,
      forDate,
      completed: false,
      createdAt: serverTimestamp()
    });
  };

  const toggleQuickTask = async (id, completed) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'quickTasks', id), {
      completed,
      completedAt: completed ? serverTimestamp() : null
    });
  };

  const deleteQuickTask = async (id) => {
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'quickTasks', id));
  };

  return { quickTasks, loading, addQuickTask, toggleQuickTask, deleteQuickTask };
};
