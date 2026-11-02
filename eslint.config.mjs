import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['**/*.ts', '**/*.tsx'];

const eslintConfig = tseslint.config(
  { ignores: ['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  {
    files: sourceFiles,
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Use an `as const` object instead of `enum`.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read environment variables through lib/config/env.ts.',
        },
      ],
    },
  },
  {
    files: ['lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['lib/config/env.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
);

export default eslintConfig;
