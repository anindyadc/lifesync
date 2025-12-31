import { useState, useEffect } from 'react';
import {
  collection, addDoc, onSnapshot, serverTimestamp, Timestamp,
  updateDoc, doc, deleteDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

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
    const tsDate = new Date(data.date);
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
    const tsDate = new Date(data.date);
    const now = new Date();
    tsDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs', id), {
      ...data,
      date: Timestamp.fromDate(tsDate),
      updatedAt: serverTimestamp()
    });
  };

  const deleteChange = async (id) => {
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs', id));
  };

  const archiveChange = async (id) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs', id), {
      status: 'archived',
      updatedAt: serverTimestamp()
    });
  };

  return { changes, loading, addChange, updateChange, deleteChange, archiveChange };
};