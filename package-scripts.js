/* eslint-disable node/no-extraneous-require */

const {concurrent} = require('nps-utils')

module.exports = {
  scripts: {
    lint: {
      default: concurrent.nps('lint.eslint', 'lint.commitlint'),
      eslint: {
        script: 'eslint .',
        description: 'lint js files',
      },
      commitlint: {
        script: 'commitlint --from origin/master',
        description: 'ensure that commits are in valid conventional-changelog format',
      },
    },
    test: {
      default: {
        script: concurrent.nps('lint', 'test.single'),
        description: 'lint and test',
      },
      single: {
        script: 'node ./scripts/test single',
        description: 'test single CLI generator',
      },
    },
    ci: {
      default: {
        script: concurrent.nps(
          'ci.eslint',
        ),
        hiddenFromHelp: true,
      },
      eslint: {
        script: concurrent.nps('lint.eslint --format junit --output-file reports/eslint.xml'),
        hiddenFromHelp: true,
      },
      release: {
        script: 'yarn --frozen-lockfile && dxcli-dev-semantic-release',
        hiddenFromHelp: true,
      },
    },
  },
}
