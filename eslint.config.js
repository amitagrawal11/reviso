import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'build/**', 'coverage/**', 'node_modules/**', 'public/landing/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // Naming conventions — codified after the 2026-05 naming review.
  // Applies only to source files (not tests/config) and only to TS so the
  // rule can use type information without crashing on JS configs.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', 'src/test/**', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        // Variables: camelCase locals, UPPER_CASE constants, PascalCase for React components.
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        // Functions: camelCase (helpers/handlers) or PascalCase (components).
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        // Types / interfaces / enums: PascalCase.
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        // Enum members: PascalCase or UPPER_CASE.
        {
          selector: 'enumMember',
          format: ['PascalCase', 'UPPER_CASE'],
        },
      ],
      // Hooks: enforced by react-hooks plugin via use* convention.
      // Disallow obviously abbreviated identifiers that the review flagged.
      'id-denylist': ['warn', 'cb', 'fn', 'mgr', 'cfg', 'tmp', 'val', 'res', 'req'],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'warn',
    },
  },
);
