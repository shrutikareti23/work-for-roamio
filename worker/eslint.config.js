import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', '.wrangler', 'dist'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // In tests, `value!` ("I know this exists") keeps assertions short and readable.
    files: ['test/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
