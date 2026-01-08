// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    files: [
      '**/*.spec.ts', 
      'src/modules/notifications/notifications.gateway.ts',
      'src/modules/notifications/notifications.service.ts',
      'src/modules/notifications/notifications.controller.ts',
      'src/modules/finance/finance.service.ts',
      'src/modules/files/files.service.ts',
      'src/modules/files/files.controller.ts',
      'src/modules/orders/orders.service.ts',
      'src/modules/tenants/tenants.service.ts',
      'src/modules/iam/authentication/authentication.service.ts',
      'src/common/filters/http-exception.filter.ts',
      'src/common/filters/all-exceptions.filter.ts',
      'src/common/interceptors/transform.interceptor.ts',
      'src/common/decorators/active-user.decorator.ts'
    ],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  }
);
