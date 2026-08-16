module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    'jest': true,
  },
  extends: ['eslint:recommended', 'plugin:react/recommended'],
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
    // This codebase uses function components without PropTypes throughout and
    // does not depend on the prop-types package. Validate types where it matters
    // via tests instead of forcing PropTypes annotations on every component.
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
