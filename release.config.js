/* eslint-disable no-template-curly-in-string */

module.exports = {
  verifyConditions: [
    {
      path: '@semantic-release/exec',
      cmd: './node_modules/.bin/nps build',
    },
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
  prepare: [
    {
      path: '@semantic-release/exec',
      cmd: 'OCLIF_NEXT_VERSION=${nextRelease.version} yarn run version',
    },
    {path: './scripts/release-example'},
    '@semantic-release/changelog',
    '@semantic-release/npm',
    {
      path: '@semantic-release/git',
      assets: ['package.json', 'CHANGELOG.md', 'README.md', 'docs'],
    },
  ],
  publish: [
    '@semantic-release/npm',
    '@semantic-release/github',
    {
      path: '@semantic-release/exec',
      cmd: './scripts/release-create-oclif.js',
    },
  ],
}
