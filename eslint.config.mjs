import {includeIgnoreFile} from '@eslint/compat'
import oclif from 'eslint-config-oclif'
import prettier from 'eslint-config-prettier'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const gitignorePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.gitignore')

export default [
  includeIgnoreFile(gitignorePath),
  {
    ignores: ['/examples/**/*', '/lib/**/*', '/templates/**/*', '/tmp/**/*', '/test/fixtures/**/*'],
  },
  ...oclif,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-constructor': 'off',
      'prefer-destructuring': 'off',
      'unicorn/consistent-destructuring': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-empty-file': 'off',
      'unicorn/prefer-module': 'off',
    },
  },
  {
    files: ['test/**/*'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'sort-imports': 'off',
      'unicorn/consistent-function-scoping': 'off',
    },
  },
  {
    files: ['test/fixtures/**/*'],
    rules: {
      'n/no-extraneous-import': 'off',
    },
  },
]
