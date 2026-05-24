import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['dist/', 'node_modules/', 'next-app/'],
  },
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'off',
    },
  },
];
