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
    {
      path: '@semantic-release/exec',
      cmd: './.circleci/release_example ${nextRelease.version} ${nextRelease.type} ${nextRelease.notes}',
    },
    '@semantic-release/changelog',
    '@semantic-release/npm',
    {
      path: '@semantic-release/git',
      assets: ['package.json', 'CHANGELOG.md'],
    },
    '@semantic-release/github',
  ],
}
