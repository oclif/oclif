/* eslint-disable no-template-curly-in-string */

module.exports = {
  verifyConditions: [
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
  publish: [
    {
      path: '@semantic-release/exec',
      cmd: './.circleci/release_example ${nextRelease.version}',
    },
    '@semantic-release/changelog',
    '@semantic-release/npm',
    {
      path: '@semantic-release/git',
      assets: ['package.json', 'examples', 'CHANGELOG.md'],
    },
    '@semantic-release/github',
  ],
}
