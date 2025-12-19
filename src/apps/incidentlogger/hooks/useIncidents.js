
import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const APP_ID = 'default-app-id';

export const useIncidents = (user) => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents'),
      orderBy('reportedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setIncidents(data);
        setLoading(false);
      },
      (error) => {
        console.error('useIncidents: Error fetching incidents:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addIncident = async (incidentData) => {
    console.log('addIncident: Attempting to add new incident with data:', incidentData);
    try {
      const docRef = await addDoc(
        collection(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents'),
        {
          ...incidentData,
          reportedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
      console.log('addIncident: Successfully added incident with ID:', docRef.id);
    } catch (error) {
      console.error('addIncident: Error writing new incident to Firestore:', error);
    }
  };

  const updateIncident = async (id, incidentData) => {
    await updateDoc(
      doc(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents', id),
      {
        ...incidentData,
        updatedAt: serverTimestamp(),
      }
    );
  };

  const deleteIncident = async (id) => {
    await deleteDoc(
      doc(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents', id)
    );
  };

  return { incidents, loading, addIncident, updateIncident, deleteIncident };
};
