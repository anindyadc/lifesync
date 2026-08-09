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
    // user?.uid, not the `user` object reference — a new object per parent render
    // (common with Firebase auth listeners) would otherwise tear down and resubscribe
    // this listener on every unrelated re-render of the parent.
  }, [user?.uid]);

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

  const addPrescription = async (prescriptionData) => {
    console.log("addPrescription started", { prescriptionData });
    if (!user?.uid) {
      console.log("No user uid, returning");
      return;
    }
    try {
      const { archiveOld, newPhotos = [], ...dataToSave } = prescriptionData;
      
      // Since photos are now Base64 strings, we store them directly in the document
      const photoUrls = newPhotos; 

      if (archiveOld && dataToSave.disease) {
        console.log("Archiving old prescriptions...");
        const normalize = (s) => (s || '').trim().toLowerCase();
        const toArchive = prescriptions.filter(p =>
          !p.archived &&
          normalize(p.patientName) === normalize(dataToSave.patientName) &&
          normalize(p.doctorName) === normalize(dataToSave.doctorName) &&
          normalize(p.disease) === normalize(dataToSave.disease)
        );
        const archivePromises = toArchive.map(p => archivePrescription(p.id, true));
        await Promise.all(archivePromises);
        console.log("Archived", toArchive.length, "prescriptions");
      }

      console.log("Adding document to Firestore...");
      const prescriptionsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'prescriptions');
      // No separate `photoUrl` field here — it used to duplicate the full Base64 payload
      // of the first photo a second time in the same doc, doubling its size against the
      // 1MiB Firestore limit. `photoUrls` is the only source of truth for new documents;
      // `photoUrl` only still gets *read* as a fallback for legacy pre-array docs.
      const docRef = await addDoc(prescriptionsRef, {
        ...dataToSave,
        photoUrls: photoUrls,
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("Document added with ID:", docRef.id);
    } catch (err) {
      console.error('Error adding prescription:', err);
      throw err;
    }
  };

  const updatePrescription = async (id, updatedData) => {
    if (!user?.uid || !id) return;
    try {
      const { existingPhotos = [], newPhotos = [], ...dataToSave } = updatedData;

      // Combine existing photos (URLs) and new photos (Base64 strings)
      const finalPhotoUrls = [...existingPhotos, ...newPhotos];

      // Any previously-saved Storage-backed photo (legacy, pre-Base64) that the user removed
      // during this edit needs to be cleaned up, or it's orphaned in Storage forever.
      const priorPrescription = prescriptions.find((p) => p.id === id);
      const priorPhotoUrls = priorPrescription?.photoUrls || (priorPrescription?.photoUrl ? [priorPrescription.photoUrl] : []);
      const removedStorageUrls = priorPhotoUrls.filter(
        (url) => !existingPhotos.includes(url) && !url.startsWith('data:')
      );

      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'prescriptions', id);
      await updateDoc(docRef, {
        ...dataToSave,
        photoUrls: finalPhotoUrls,
        updatedAt: serverTimestamp(),
      });

      await Promise.all(
        removedStorageUrls.map(async (url) => {
          try {
            await deleteObject(ref(storage, url));
          } catch (storageErr) {
            console.error('Error deleting removed photo from storage:', storageErr);
          }
        })
      );
    } catch (err) {
      console.error('Error updating prescription:', err);
      throw err;
    }
  };

  const deletePrescription = async (id, photoUrl, photoUrls = []) => {
    if (!user?.uid || !id) return;
    try {
      // Delete document
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'prescriptions', id);
      await deleteDoc(docRef);

      // Attempt to delete photos from storage if exists — only Storage-backed (legacy)
      // URLs, same filter updatePrescription already applies. A Base64 `data:` URI isn't
      // a Storage object at all, so passing it to deleteObject threw an "invalid-argument"
      // error per photo on every delete of a (now-typical) Base64-photo prescription.
      const urlsToDelete = ((photoUrls && photoUrls.length > 0) ? photoUrls : (photoUrl ? [photoUrl] : []))
        .filter((url) => !url.startsWith('data:'));
      const deletePromises = urlsToDelete.map(async (url) => {
        try {
          const fileRef = ref(storage, url);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.error('Error deleting photo from storage:', storageErr);
          // Don't throw here, document is already deleted
        }
      });
      await Promise.all(deletePromises);
    } catch (err) {
      console.error('Error deleting prescription:', err);
      throw err;
    }
  };

  return { prescriptions, loading, error, addPrescription, updatePrescription, deletePrescription, archivePrescription };
}
