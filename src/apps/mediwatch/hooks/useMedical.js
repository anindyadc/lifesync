import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';

export function useMedical(user) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const appId = 'default-app-id'; // To match existing apps

  useEffect(() => {
    if (!user?.uid) return;

    const prescriptionsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'prescriptions');
    const q = query(prescriptionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPrescriptions(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching prescriptions:', err);
        setError('Failed to load prescriptions');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const archivePrescription = async (id, isArchived = true) => {
    if (!user?.uid || !id) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'prescriptions', id);
      await updateDoc(docRef, {
        archived: isArchived,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error archiving prescription:', err);
      throw err;
    }
  };

  const addPrescription = async (prescriptionData, photoFile) => {
    if (!user?.uid) return;
    try {
      let photoUrl = '';
      if (photoFile) {
        const fileExtension = photoFile.name.split('.').pop() || 'jpg';
        const fileName = `prescriptions/${user.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      }

      const { archiveOld, ...dataToSave } = prescriptionData;

      if (archiveOld && dataToSave.disease) {
        const toArchive = prescriptions.filter(p => 
          !p.archived && 
          p.patientName === dataToSave.patientName && 
          p.doctorName === dataToSave.doctorName && 
          p.disease === dataToSave.disease
        );
        for (const p of toArchive) {
          await archivePrescription(p.id, true);
        }
      }

      const prescriptionsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'prescriptions');
      await addDoc(prescriptionsRef, {
        ...dataToSave,
        photoUrl,
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding prescription:', err);
      throw err;
    }
  };

  const updatePrescription = async (id, updatedData) => {
    if (!user?.uid || !id) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'prescriptions', id);
      await updateDoc(docRef, {
        ...updatedData,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating prescription:', err);
      throw err;
    }
  };

  const deletePrescription = async (id, photoUrl) => {
    if (!user?.uid || !id) return;
    try {
      // Delete document
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'prescriptions', id);
      await deleteDoc(docRef);

      // Attempt to delete photo from storage if exists
      if (photoUrl) {
        try {
          // A bit hacky way to extract path from download URL or we can just try creating ref from URL
          const fileRef = ref(storage, photoUrl);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.error('Error deleting photo from storage:', storageErr);
          // Don't throw here, document is already deleted
        }
      }
    } catch (err) {
      console.error('Error deleting prescription:', err);
      throw err;
    }
  };

  return { prescriptions, loading, error, addPrescription, updatePrescription, deletePrescription, archivePrescription };
}
