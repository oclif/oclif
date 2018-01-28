const {
  concurrent,
  series,
  setColors,
  mkdirp,
} = require('nps-utils')
const script = (script, description) => description ? {script, description} : {script}
const hidden = script => ({script, hiddenFromHelp: true})
const _ = require('lodash')

setColors(['dim'])

const testTypes = ['base', 'plugin', 'single', 'multi']
const tests = testTypes.map(cmd => {
  let mocha = 'mocha --forbid-only'
  let tests = _(['plain', 'mocha', 'typescript', 'everything'])
    .map(t => [t, `test/commands/${cmd}/${t}.test.js`])
    .map(([t, s]) => [t, process.env.CIRCLECI ? `MOCHA_FILE=reports/mocha-${t}.xml ${mocha} --reporter mocha-junit-reporter ${s}` : `${mocha} ${s}`])
  tests = process.platform === 'win32' ?
    series(...tests.map(t => t[1]).value()) :
    concurrent(tests.fromPairs().value())
  if (process.env.CIRCLECI) {
    return [cmd, series(mkdirp('reports'), tests)]
  }
  return [cmd, tests]
})

module.exports = {
  scripts: {
    build: 'rm -rf lib && tsc',
    lint: {
      default: concurrent.nps('lint.eslint', 'lint.commitlint', 'lint.tsc', 'lint.tslint'),
      eslint: script('eslint .', 'lint js files'),
      commitlint: script('commitlint --from origin/master', 'ensure that commits are in valid conventional-changelog format'),
      tsc: script('tsc --noEmit', 'syntax check with tsc'),
      tslint: script('tslint -p .', 'lint ts files'),
    },
    test: {
      default: series.nps(...testTypes.map(t => `test.${t}`)),
      ..._.fromPairs(tests),
    },
    release: hidden('semantic-release -e @dxcli/semantic-release'),
  },
}
