import { useState, useEffect } from 'react';
import {
  collection, addDoc, onSnapshot, serverTimestamp, Timestamp,
  updateDoc, doc, deleteDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { safeGetDate } from '../../../lib/utils';

const APP_ID = 'default-app-id';

export const useChanges = (user) => {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by Date Descending
      data.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      
      setChanges(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const addChange = async (data) => {
    const tsDate = safeGetDate(data.date) || new Date();
    // Add current time to date for sorting precision
    const now = new Date();
    tsDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs'), {
      ...data,
      date: Timestamp.fromDate(tsDate),
      performedBy: user.displayName || user.email,
      createdAt: serverTimestamp()
    });
  };

  const updateChange = async (id, data) => {
    const newDate = safeGetDate(data.date) || new Date();
    const existing = changes.find(c => c.id === id);
    const existingDate = existing?.date?.toDate ? existing.date.toDate() : null;

    // If the calendar day hasn't changed, keep the original time-of-day so
    // editing an unrelated field doesn't bump this entry's position in the
    // date-sorted list/timeline. Only re-stamp "now" when the day actually moved.
    let tsDate;
    if (existingDate &&
        existingDate.getFullYear() === newDate.getFullYear() &&
        existingDate.getMonth() === newDate.getMonth() &&
        existingDate.getDate() === newDate.getDate()) {
      tsDate = existingDate;
    } else {
      const now = new Date();
      tsDate = newDate;
      tsDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs', id), {
      ...data,
      date: Timestamp.fromDate(tsDate),
      updatedAt: serverTimestamp()
    });
  };

  const deleteChange = async (id) => {
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs', id));
  };

  const archiveChange = async (id, currentStatus) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs', id), {
      status: 'archived',
      previousStatus: currentStatus && currentStatus !== 'archived' ? currentStatus : 'success',
      updatedAt: serverTimestamp()
    });
  };

  const unarchiveChange = async (id, previousStatus) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs', id), {
      status: previousStatus || 'success',
      updatedAt: serverTimestamp()
    });
  };

  return { changes, loading, addChange, updateChange, deleteChange, archiveChange, unarchiveChange };
};