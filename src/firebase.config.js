import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const environmentConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
export const firebaseConfigured = requiredKeys.every((key) => Boolean(environmentConfig[key]));

// Keep the public shell renderable in local previews without silently connecting to
// a recovered production project. Auth and data services reject operations while
// this inert configuration is active.
const firebaseConfig = firebaseConfigured
  ? environmentConfig
  : {
      apiKey: 'omnianalytics-not-configured',
      authDomain: 'localhost',
      projectId: 'omnianalytics-local-preview',
      appId: 'omnianalytics-local-preview',
    };

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
