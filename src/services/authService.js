import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  signInWithEmailAndPassword,
  signInWithPopup,
  linkWithPopup,
  unlink,
  GithubAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, db, firebaseConfigured } from '../firebase.config';
import { doc, setDoc, getDoc, deleteField } from 'firebase/firestore';

const assertFirebaseConfigured = () => {
  if (!firebaseConfigured) {
    throw new Error('Firebase is not configured for this preview. Add the local Vite Firebase environment variables to enable account access.');
  }
};

const GITHUB_PROVIDER_ID = 'github.com';

const createGithubProvider = () => {
  const provider = new GithubAuthProvider();
  provider.addScope('user:email');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
};

// Sentinels for the best-effort provider profile sync below.
const REMOVE_FIELD = Symbol('remove');

// Mirror the live provider ids (and optionally the GitHub handle) into the
// users/{uid} profile so stored records stay coherent with Firebase identity.
// The sync never blocks sign-in: the live auth identity is authoritative, and
// a stale linkedProviders/githubUsername only affects non-critical surfaces.
const syncProviderIdentity = async (user, githubUsername) => {
  try {
    const providerIds = (user.providerData || [])
      .map((entry) => entry.providerId)
      .filter(Boolean);
    const updates = { linkedProviders: providerIds };
    if (githubUsername === REMOVE_FIELD) {
      updates.githubUsername = deleteField();
    } else if (githubUsername) {
      updates.githubUsername = githubUsername;
    }
    await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
  } catch {
    // Ignored: the live Firebase identity remains the source of truth.
  }
};

export const formatAuthError = (authError) => {
  const message = authError?.message || 'Authentication failed. Please try again.';
  return message.replace('Firebase: ', '').replace(/\s*\(auth\/[\w-]+\)\.?/, '');
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

export const signInWithGitHub = async () => {
  try {
    assertFirebaseConfigured();
    const provider = createGithubProvider();

    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const githubUsername = getAdditionalUserInfo(result)?.username || '';

    // Ensure a users/{uid} profile exists. GitHub accounts sign in on the
    // create-account tab too, so create the doc when missing and keep the
    // provider identity current without overwriting existing profile data.
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'GitHub user');
    const profile = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      provider: 'github',
      status: 'active',
    };

    if (profileSnap.exists()) {
      await setDoc(
        profileRef,
        { email: profile.email, displayName: profile.displayName, provider: 'github' },
        { merge: true }
      );
    } else {
      await setDoc(profileRef, { ...profile, createdAt: new Date() });
    }
    // githubUsername is written only by syncProviderIdentity. Accounts that
    // signed in with GitHub before this field existed self-heal on next sign-in.
    await syncProviderIdentity(user, githubUsername);

    return user;
  } catch (error) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      throw new Error(
        'An account with this email already exists. Sign in with your email and password, then link GitHub from Settings > Connected accounts.'
      );
    }
    throw new Error(error.message);
  }
};

export const linkGitHub = async () => {
  try {
    assertFirebaseConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No signed-in session to link.');

    const result = await linkWithPopup(currentUser, createGithubProvider());
    const githubUsername = getAdditionalUserInfo(result)?.username || '';
    await syncProviderIdentity(result.user, githubUsername);
    return result.user;
  } catch (error) {
    if (error.code === 'auth/credential-already-in-use') {
      throw new Error('This GitHub account is already linked to another OmniAnalytics account.');
    }
    if (error.code === 'auth/provider-already-linked') {
      throw new Error('GitHub is already linked to this account.');
    }
    throw new Error(error.message);
  }
};

export const unlinkGitHub = async () => {
  try {
    assertFirebaseConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No signed-in session to unlink.');

    const user = await unlink(currentUser, GITHUB_PROVIDER_ID);
    await syncProviderIdentity(user, REMOVE_FIELD);
    return user;
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
