import './src/firebase.js';

// Import all modules to ensure they're available
import './src/auth.js';
import './src/project.js';
import './src/login.js';
import './src/register.js';
import './src/create-project.js';
import './src/app.js';

// Export for external use
export { app, auth, db } from './src/firebase.js';
export * from './src/auth.js';
export * from './src/project.js';
