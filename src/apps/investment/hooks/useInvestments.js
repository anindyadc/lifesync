import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { safeGetDate } from '../../../lib/utils';

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

// For the newer optional money fields (currentValue/purchasePrice/sipAmount/saleValue):
// returns null when there's nothing to write (blank/invalid input) so the caller can
// skip (add) or deleteField() (update) the key entirely, rather than writing an empty
// string that would later decrypt back as a scary "undecryptable" `null`.
const encryptOptional = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  return encryptAmount(num);
};

// undefined = field was never written for this doc ("not tracked"), distinct from a
// present-but-corrupt value which still resolves to null via decryptAmount.
const decryptOptional = (encryptedValue) => {
  if (encryptedValue === undefined) return undefined;
  return decryptAmount(encryptedValue);
};

export const useInvestments = (userId) => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const investmentsCollectionRef = collection(db, `artifacts/default-app-id/users/${userId}/investment`);
    // No server-side orderBy: market-linked entries now legitimately have no
    // maturityDate, and Firestore's orderBy silently excludes any doc missing the
    // ordered field entirely — sort client-side instead so those still show up.
    const q = query(investmentsCollectionRef);

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const fetchedInvestments = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            amount: decryptAmount(data.amountEncrypted),
            currentValue: decryptOptional(data.currentValueEncrypted),
            purchasePrice: decryptOptional(data.purchasePriceEncrypted),
            sipAmount: decryptOptional(data.sipAmountEncrypted),
            saleValue: decryptOptional(data.saleValueEncrypted),
          };
        });
        fetchedInvestments.sort((a, b) => {
          const da = safeGetDate(a.maturityDate) || safeGetDate(a.investmentDate);
          const dbb = safeGetDate(b.maturityDate) || safeGetDate(b.investmentDate);
          if (!da && !dbb) return 0;
          if (!da) return 1;
          if (!dbb) return -1;
          return da - dbb;
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
      const { amount, currentValue, purchasePrice, sipAmount, ...rest } = investmentData;
      const payload = {
        ...rest,
        amountEncrypted: encryptAmount(amount),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const cv = encryptOptional(currentValue);
      if (cv !== null) payload.currentValueEncrypted = cv;
      const pp = encryptOptional(purchasePrice);
      if (pp !== null) payload.purchasePriceEncrypted = pp;
      const sa = encryptOptional(sipAmount);
      if (sa !== null) payload.sipAmountEncrypted = sa;

      await addDoc(collection(db, `artifacts/default-app-id/users/${userId}/investment`), payload);
    } catch (e) {
      console.error("Error adding investment: ", e);
      setError("Failed to add investment.");
    }
  }, [userId]);

  const updateInvestment = useCallback(async (id, investmentData) => {
    try {
      const { amount, currentValue, purchasePrice, sipAmount, ...rest } = investmentData;
      const payload = {
        ...rest,
        amountEncrypted: encryptAmount(amount),
        updatedAt: serverTimestamp(),
      };
      const cv = encryptOptional(currentValue);
      payload.currentValueEncrypted = cv !== null ? cv : deleteField();
      const pp = encryptOptional(purchasePrice);
      payload.purchasePriceEncrypted = pp !== null ? pp : deleteField();
      const sa = encryptOptional(sipAmount);
      payload.sipAmountEncrypted = sa !== null ? sa : deleteField();

      const investmentRef = doc(db, `artifacts/default-app-id/users/${userId}/investment`, id);
      await updateDoc(investmentRef, payload);
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

  // Records a sale/redemption of a market-linked holding (Stocks/Mutual Fund/Smallcase).
  // Kept on the same doc rather than a separate transactions collection — this app
  // tracks one lot per holding, not per-installment SIP tranches (see Tax Summary note).
  const sellInvestment = useCallback(async (id, { soldDate, saleValue }) => {
    try {
      const investmentRef = doc(db, `artifacts/default-app-id/users/${userId}/investment`, id);
      await updateDoc(investmentRef, {
        status: 'sold',
        soldDate,
        saleValueEncrypted: encryptAmount(saleValue),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error recording sale: ", e);
      setError("Failed to record sale.");
    }
  }, [userId]);

  const reopenInvestment = useCallback(async (id) => {
    try {
      const investmentRef = doc(db, `artifacts/default-app-id/users/${userId}/investment`, id);
      await updateDoc(investmentRef, {
        status: 'active',
        soldDate: deleteField(),
        saleValueEncrypted: deleteField(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error reopening investment: ", e);
      setError("Failed to reopen investment.");
    }
  }, [userId]);

  return { investments, loading, error, addInvestment, updateInvestment, deleteInvestment, sellInvestment, reopenInvestment };
};
