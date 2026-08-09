import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// IMPORTANT: For a production application, this key should NEVER be hardcoded.
// It should be securely derived from the user's password (e.g., using PBKDF2)
// or managed via a secure backend/key management service. Storing it client-side
// even obfuscated, is insecure for real-world sensitive data.
const ENV_SECRET_KEY = import.meta.env.VITE_INVESTMENT_SECRET_KEY;
if (!ENV_SECRET_KEY) {
  console.warn(
    'VITE_INVESTMENT_SECRET_KEY is not set. Falling back to an insecure default key — ' +
    'investment amounts have no real confidentiality until this env var is configured.'
  );
}
const SECRET_KEY = ENV_SECRET_KEY || 'your-super-secret-key';

const encryptAmount = (amount) => {
  if (!amount) return '';
  const encrypted = CryptoJS.AES.encrypt(amount.toString(), SECRET_KEY).toString();
  return encrypted;
};

// Returns null (not 0) when the value can't be trusted, so callers can tell
// "decryption failed / key mismatch / never recorded" apart from a real zero-amount
// investment — a missing amountEncrypted used to read back as a trustworthy 0 here.
const decryptAmount = (encryptedAmount) => {
  if (!encryptedAmount) return null;
  try {
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedAmount, SECRET_KEY);
    const decryptedAmount = decryptedBytes.toString(CryptoJS.enc.Utf8);
    const parsed = parseFloat(decryptedAmount);
    return isNaN(parsed) ? null : parsed;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
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
