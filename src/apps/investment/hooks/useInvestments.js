import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// IMPORTANT: For a production application, this key should NEVER be hardcoded.
// It should be securely derived from the user's password (e.g., using PBKDF2)
// or managed via a secure backend/key management service. Storing it client-side
// even obfuscated, is insecure for real-world sensitive data.
const SECRET_KEY = 'your-super-secret-key'; // Replace with a strong, securely managed key

const encryptAmount = (amount) => {
  if (!amount) return '';
  const encrypted = CryptoJS.AES.encrypt(amount.toString(), SECRET_KEY).toString();
  return encrypted;
};

const decryptAmount = (encryptedAmount) => {
  if (!encryptedAmount) return 0;
  try {
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedAmount, SECRET_KEY);
    const decryptedAmount = decryptedBytes.toString(CryptoJS.enc.Utf8);
    return parseFloat(decryptedAmount);
  } catch (error) {
    console.error("Decryption failed:", error);
    return 0; // Return 0 or handle error appropriately
  }
};

export const useInvestments = (userId) => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



  useEffect(() => {
    const investmentsCollectionRef = collection(db, `artifacts/default-app-id/users/${userId}/investment`);
    const q = query(investmentsCollectionRef, orderBy('maturityDate', 'asc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedInvestments = [...snapshot.docs].map(doc => {
          return {
            id: doc.id,
            ...doc.data(),
            amount: decryptAmount(doc.data().amountEncrypted) // Decrypt on fetch
          };
        });
        setInvestments(fetchedInvestments);
        setLoading(false);
      }, 
      (err) => {
        console.error("Failed to fetch investment:", err);
        setError("Failed to load investment.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);



  const addInvestment = useCallback(async (investmentData) => {
    try {
      const { amount, ...rest } = investmentData;
      const amountEncrypted = encryptAmount(amount);

      await addDoc(collection(db, `artifacts/default-app-id/users/${userId}/investment`), {
        ...rest,
        amountEncrypted, // Store encrypted amount
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error adding investment: ", e);
      setError("Failed to add investment.");
    }
  }, [userId]);

  const updateInvestment = useCallback(async (id, investmentData) => {
    try {
      const { amount, ...rest } = investmentData;
      const amountEncrypted = encryptAmount(amount);

      const investmentRef = doc(db, `artifacts/default-app-id/users/${userId}/investment`, id);
      await updateDoc(investmentRef, {
        ...rest,
        amountEncrypted, // Update with encrypted amount
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error updating investment: ", e);
      setError("Failed to update investment.");
    }
  }, [userId]);

  const deleteInvestment = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, `artifacts/default-app-id/users/${userId}/investment`, id));
    } catch (e) {
      console.error("Error deleting investment: ", e);
      setError("Failed to delete investment.");
    }
  }, [userId]);

  return { investments, loading, error, addInvestment, updateInvestment, deleteInvestment };
};
