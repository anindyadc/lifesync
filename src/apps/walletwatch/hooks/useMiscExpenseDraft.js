import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const APP_ID = 'default-app-id';

// crypto.randomUUID() only exists in secure contexts (https:// or localhost) — on a
// phone hitting the dev server over a plain http://LAN-IP address it's undefined, which
// would otherwise throw and abort the whole add. This fallback works everywhere.
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// A single running draft of small, uncategorized-until-saved expenses (tea, auto,
// snacks...) that gets jotted down at different times of day across separate app
// opens, then combined into one transaction whenever the user is ready. Persisted in
// Firestore (not local React state) specifically so it survives closing the app/tab —
// unlike a same-session batch entry, these items are never all entered at once.
export const useMiscExpenseDraft = (user) => {
  const [draftItems, setDraftItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const draftRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'miscExpenseDraft');
    const unsubscribe = onSnapshot(draftRef, (docSnap) => {
      setDraftItems(docSnap.exists() ? (docSnap.data().items || []) : []);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Misc Expense Draft Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const saveItems = async (items) => {
    if (!user) return;
    const draftRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'miscExpenseDraft');
    await setDoc(draftRef, { items }, { merge: true });
  };

  // arrayUnion/arrayRemove (not a read-modify-write of the full `items` array) so two
  // tabs/devices adding or removing an item near-simultaneously can't lose one to a
  // last-write-wins overwrite — each op is atomic server-side regardless of what this
  // client's local `draftItems` snapshot happened to be.
  const addDraftItem = async ({ label, amount }) => {
    if (!user) return;
    const trimmed = (label || '').trim();
    const amountNum = Number(amount);
    if (!trimmed || !amountNum || amountNum <= 0) return;
    const newItem = { id: generateId(), label: trimmed, amount: amountNum, addedAt: new Date().toISOString() };
    const draftRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'miscExpenseDraft');
    await setDoc(draftRef, { items: arrayUnion(newItem) }, { merge: true });
  };

  const removeDraftItem = async (id) => {
    if (!user) return;
    const item = draftItems.find(i => i.id === id);
    if (!item) return;
    const draftRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'miscExpenseDraft');
    await setDoc(draftRef, { items: arrayRemove(item) }, { merge: true });
  };

  const clearDraft = async () => {
    await saveItems([]);
  };

  return { draftItems, loading, addDraftItem, removeDraftItem, clearDraft };
};
