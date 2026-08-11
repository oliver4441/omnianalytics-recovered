import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, db, firebaseConfigured } from '../firebase.config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const assertFirebaseConfigured = () => {
  if (!firebaseConfigured) {
    throw new Error('Firebase is not configured for this preview. Add the local Vite Firebase environment variables to enable account access.');
  }
};

export const signUpWithEmail = async (email, password, displayName) => {
  try {
    assertFirebaseConfigured();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    await updateProfile(user, { displayName });
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: displayName || '',
      createdAt: new Date(),
      status: 'active',
    });
    return user;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    assertFirebaseConfigured();
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const logoutUser = async () => {
  try {
    assertFirebaseConfigured();
    await signOut(auth);
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const getUserProfile = async (uid) => {
  try {
    assertFirebaseConfigured();
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const onAuthChange = (callback) => {
  if (!firebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};
