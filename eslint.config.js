// ESLint flat config (v9+)
// Configuration for Node.js backend and vanilla JS frontend

import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Apply to all JavaScript files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals for backend
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',

        // Browser globals for frontend
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        L: 'readonly', // Leaflet global
        fetch: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,

      // Prettier integration
      'prettier/prettier': 'error',

      // Best practices
      'no-console': 'off', // Allow console for server and debugging
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'prefer-const': 'warn',
      'no-var': 'warn',

      // Code style (handled by Prettier mostly)
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  },

  // Backend-specific rules (index.js, lib/)
  {
    files: ['index.js', 'lib/**/*.js'],
    languageOptions: {
      globals: {
        // Only Node.js globals
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
      },
    },
  },

  // Frontend-specific rules (static/)
  {
    files: ['static/**/*.js'],
    languageOptions: {
      globals: {
        // Browser and Leaflet globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        L: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      // Browser-specific rules
      'no-console': 'off', // Allow console.log for debugging
    },
  },

  // Prettier config to disable conflicting rules
  prettierConfig,

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      'provider-data/**',
      '.env',
      '.env.*',
    ],
  },
];
