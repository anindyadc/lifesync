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
        const toArchive = prescriptions.filter(p => 
          !p.archived && 
          p.patientName === dataToSave.patientName && 
          p.doctorName === dataToSave.doctorName && 
          p.disease === dataToSave.disease
        );
        const archivePromises = toArchive.map(p => archivePrescription(p.id, true));
        await Promise.all(archivePromises);
        console.log("Archived", toArchive.length, "prescriptions");
      }

      console.log("Adding document to Firestore...");
      const prescriptionsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'prescriptions');
      const docRef = await addDoc(prescriptionsRef, {
        ...dataToSave,
        photoUrl: photoUrls.length > 0 ? photoUrls[0] : '',
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

      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'prescriptions', id);
      await updateDoc(docRef, {
        ...dataToSave,
        photoUrls: finalPhotoUrls,
        photoUrl: finalPhotoUrls.length > 0 ? finalPhotoUrls[0] : '',
        updatedAt: serverTimestamp(),
      });
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

      // Attempt to delete photos from storage if exists
      const urlsToDelete = (photoUrls && photoUrls.length > 0) ? photoUrls : (photoUrl ? [photoUrl] : []);
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
