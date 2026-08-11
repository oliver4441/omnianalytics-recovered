// Compatibility exports for recovered modules. Firebase is initialized once in
// firebase.config.js; new application code should import that module directly.
export { app, auth, db, default, firebaseConfigured } from './firebase.config';
