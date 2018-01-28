/* eslint-disable no-template-curly-in-string */

module.exports = {
  verifyConditions: [
    {
      path: '@semantic-release/exec',
      cmd: 'nps build',
    },
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
  publish: [
    {path: './scripts/release_example'},
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
}
