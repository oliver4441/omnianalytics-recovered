module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    'jest': true,
  },
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  ignorePatterns: [
    // Recovered pre-React modules and tests are retained for reference only and
    // are not part of the Vite application graph. They carry known legacy debt
    // (see AGENTS.md "Recovered tests under src/__tests__/") and are excluded
    // until they are modernised or removed.
    'src/__tests__/',
    'src/setupTests.js',
    'src/main.js',
    'src/analytics.js',
    'src/app.js',
    'src/auth.js',
    'src/cache.js',
    'src/create-project.js',
    'src/database-optimizer.js',
    'src/enhanced-project.js',
    'src/enhanced-ui.js',
    'src/error-tracker.js',
    'src/lazy-loader.js',
    'src/login.js',
    'src/project.js',
    'src/register.js',
    'src/security.js',
    'src/templates.js',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react'],
  rules: {
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'warn',
    'react/react-in-jsx-scope': 'off',
    // The codebase does not use PropTypes for component contracts; enabling the
    // rule would only force boilerplate. TypeScript migration is the intended
    // long-term replacement for runtime prop validation.
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
