const script = (script, description) => description ? {script, description} : {script}
const _ = require('lodash')
const sh = require('shelljs')
const path = require('path')
const {execSync} = require('child_process')

let hasYarn = false
try {
  execSync('yarn -v', {stdio: 'ignore'})
  hasYarn = true
} catch {}

const pkgManager = hasYarn ? 'yarn' : 'npm run'

sh.set('-e')

const objectValuesToString = o => {
  if (_.isString(o)) {
    return o
  }

  const m = Object.entries(o).map(([, v]) => v)
  return m.join(' && ')
}

process.env.TEST_SERIES = '1'
const testTypes = ['commands']
const tests = testTypes.map(type => {
  const {silent} = sh.config
  sh.config.silent = true
  const mocha = 'mocha --forbid-only'
  const base = path.join('test', 'commands')
  sh.pushd(base)
  let tests = _(sh.ls())
  .map(t => [t.split('.')[0], path.join(base, t)])
  .map(([t, s]) => {
    const mochaString = process.env.CIRCLECI ? `MOCHA_FILE=reports/mocha-${t}.xml ${mocha} --reporter mocha-junit-reporter ${s}` : `${mocha} ${s}`
    const concurrentlyString = `node node_modules/concurrently/dist/bin/concurrently.js --kill-others-on-fail --prefix-colors "dim" --prefix "[{name}]" --names "${type}"`
    return [t, `${concurrentlyString} "${mochaString}"`]
  })

  sh.popd()
  tests = process.env.TEST_SERIES === '1' ?
    tests.map(t => t[1]).join(' && ') :
    tests.fromPairs().value()
  if (process.env.CIRCLECI) {
    tests = `${pkgManager} mkdirp reports && ${objectValuesToString(tests)}`
  }

  sh.config.silent = silent
  return [type, `${pkgManager} build && ${objectValuesToString(tests)}`]
})

module.exports = {
  scripts: {
    build: 'shx rm -rf lib && tsc',
    lint: {
      default: 'node node_modules/concurrently/dist/bin/concurrently.js --kill-others-on-fail --prefix-colors "dim" --prefix "[{name}]" --names "lint.tsc" \'nps lint.tsc\'',
      // eslint: script('eslint . --ext .ts --config .eslintrc', 'lint js & ts files'),
      tsc: script('tsc --noEmit', 'syntax check with tsc'),
    },
    test: Object.assign({
      default: testTypes.map(t => `nps test.${t}`).join(' && '),
    }, Object.fromEntries(tests)),
  },
}
