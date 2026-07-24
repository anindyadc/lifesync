import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { DEFAULT_CATEGORIES, getCategoryColor } from '../constants';

const APP_ID = 'default-app-id';

// Total logged minutes for a task: its own time logs plus every subtask's time logs.
// Shared by TaskList/TaskReportTable/index.jsx/useTaskExport so "time spent" means the
// same thing everywhere — previously useTaskExport read a stale `timeSpent` field that
// was never written by TaskForm, so exported reports silently showed 0.
export const getTaskMinutes = (task) => {
  const taskTime = (task.timeLogs || []).reduce((acc, log) => acc + (log.minutes || 0), 0);
  const subtaskTime = (task.subtasks || []).reduce((acc, s) =>
    acc + (s.timeLogs || []).reduce((sAcc, log) => sAcc + (log.minutes || 0), 0), 0);
  return taskTime + subtaskTime;
};

export const useTasks = (user) => {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const taskData = doc.data();
        // Ensure arrays and numbers exist to prevent crashes
        return {
          id: doc.id,
          ...taskData,
          subtasks: taskData.subtasks || [],
          timeSpent: taskData.timeSpent || 0
        };
      });
      // Sort by newest first
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(data);
      setLoading(false);
    });

    const catRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'taskConfig');
    const unsubCat = onSnapshot(catRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().categories) {
        setCategories(docSnap.data().categories);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    }, (error) => {
      console.error("Firestore Categories Error:", error);
    });

    return () => { unsubscribe(); unsubCat(); };
  }, [user]);

  const addTask = async (taskData) => {
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks'), {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  const updateTask = async (id, taskData) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks', id), {
      ...taskData,
      updatedAt: serverTimestamp()
    });
  };

  const deleteTask = async (id) => {
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks', id));
  };

  const addCategory = async (label) => {
    const trimmed = (label || '').trim();
    if (!trimmed || !user) return;
    if (categories.some(c => c.id === trimmed)) return;

    const { color, bg } = getCategoryColor(categories.length);
    const updated = [...categories, { id: trimmed, label: trimmed, color, bg }];

    const catRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'taskConfig');
    await setDoc(catRef, { categories: updated }, { merge: true });
  };

  const removeCategory = async (id) => {
    if (!user) return;
    const updated = categories.filter(c => c.id !== id);

    const catRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'taskConfig');
    await setDoc(catRef, { categories: updated }, { merge: true });
  };

  return { tasks, categories, loading, addTask, updateTask, deleteTask, addCategory, removeCategory };
};