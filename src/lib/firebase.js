import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const getFirebaseConfig = () => {
  // 1. Try Vite Environment Variables (Standard Local Dev with Vite)
  if (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }

  // 2. Try process.env (For GitHub Actions / Create React App / Standard Node)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_FIREBASE_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY) {
      return {
        apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID || process.env.REACT_APP_FIREBASE_APP_ID
      };
    }
  }

  // 3. Fallback to Global Config (Preview Environments)
  if (typeof __firebase_config !== 'undefined') {
    return JSON.parse(__firebase_config);
  }

  console.error("Firebase config not found. Please check your .env file or environment variables.");
  return {};
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);

// Export services for use in App.jsx and other modules
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/** * appId: Unique identifier for this specific deployment instance.
 * The Incident Logger and other apps use this to namespace Firestore collections.
 * Providing a default here, or you can use firebaseConfig.projectId.
 */
export const appId = 'default-app-id'; 

export default app;
