import { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, serverTimestamp, Timestamp 
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

  return { changes, loading, addChange };
};