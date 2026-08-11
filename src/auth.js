import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  getDocs,
} from 'firebase/firestore';

let authInitialized = false;
let initializationPromise = null;

function waitForAuth() {
  return new Promise((resolve) => {
    if (authInitialized) {
      resolve(auth.currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      authInitialized = true;
      unsubscribe();
      resolve(user);
    });
  });
}

export async function register(email, password) {
  await waitForAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function login(email, password) {
  await waitForAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getCurrentUser() {
  await waitForAuth();
  return auth.currentUser;
}

export async function createUserProfile(uid, { email, displayName }) {
  try {
    await setDoc(doc(db, 'users', uid), {
      email: email,
      displayName: displayName || '',
      tier: 'free',
      bonusProjects: 0,
      claimedBadges: [],
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

export async function getUserProfile(uid) {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

export async function addBonusProject(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() || {};
    const currentBonus = userData.bonusProjects || 0;

    await setDoc(
      userRef,
      {
        bonusProjects: currentBonus + 1,
        tier: 'premium',
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error('Error adding bonus project:', error);
    throw error;
  }
}

export async function upgradeUserTier(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        tier: 'premium',
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error upgrading user tier:', error);
    throw error;
  }
}

export async function getUserProjectCount(uid) {
  try {
    const projectsRef = collection(db, 'users', uid, 'projects');
    const snapshot = await getDocs(projectsRef);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting project count:', error);
    throw error;
  }
}
