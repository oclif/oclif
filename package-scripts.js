const {
  concurrent,
  setColors,
} = require('nps-utils')
const script = (script, description) => description ? {script, description} : {script}
const hidden = script => ({script, hiddenFromHelp: true})

setColors(['dim'])

const test = type => [
  `mocha test/commands/${type}/plain.test.ts`,
  `mocha test/commands/${type}/mocha.test.ts`,
  `mocha test/commands/${type}/typescript.test.ts`,
  `mocha test/commands/${type}/everything.test.ts`,
]

module.exports = {
  scripts: {
    build: 'rm -rf lib && tsc',
    lint: {
      default: concurrent.nps('lint.eslint', 'lint.commitlint', 'lint.tsc', 'lint.tslint'),
      eslint: script('eslint .', 'lint js files'),
      commitlint: script('commitlint --from origin/master', 'ensure that commits are in valid conventional-changelog format'),
      tsc: script('tsc -p test --noEmit', 'syntax check with tsc'),
      tslint: script('tslint -p test', 'lint ts files'),
    },
    test: {
      base: concurrent(test('base')),
      plugin: concurrent(test('plugin')),
      single: concurrent(test('single')),
      multi: concurrent(test('multi')),
    },
    release: hidden('semantic-release -e @dxcli/dev-semantic-release'),
  },
}
