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
  let mocha = () => 'mocha --forbid-only'
  if (process.env.CIRCLECI) {
    const m = mocha()
    mocha = type => `MOCHA_FILE=reports/mocha-${type}.xml ${m} --reporter mocha-junit-reporter`
  }

  let s = process.platform === 'win32' ? series : concurrent
  let tests = s(['plain', 'mocha', 'typescript', 'everything'].map(t => script(`${mocha(t)} test/commands/${cmd}/${t}.test.js`, t)))
  if (process.env.CI) {
    const nyc = 'nyc --extensions ts'
    return series(mkdirp('reports'), `${nyc} ${tests}`, `${nyc} report --reporter text-lcov > coverage.lcov`)
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
    release: hidden('semantic-release -e @dxcli/dev-semantic-release'),
  },
}
