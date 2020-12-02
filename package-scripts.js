/* eslint-disable unicorn/filename-case */

const {
  concurrent,
  series,
  setColors,
  mkdirp,
} = require('nps-utils')
const script = (script, description) => description ? {script, description} : {script}
const _ = require('lodash')
const sh = require('shelljs')
const path = require('path')

sh.set('-e')

setColors(['dim'])

const testTypes = ['base', 'plugin', 'single', 'multi', 'command', 'hook']
const tests = testTypes.map(cmd => {
  const {silent} = sh.config
  sh.config.silent = true
  const mocha = 'mocha --forbid-only'
  const base = path.join('test/commands', cmd)
  sh.pushd(base)
  let tests = _(sh.ls())
  .map(t => [t.split('.')[0], path.join(base, t)])
  .map(([t, s]) => [t, process.env.CIRCLECI ? `MOCHA_FILE=reports/mocha-${t}.xml ${mocha} --reporter mocha-junit-reporter ${s}` : `${mocha} ${s}`])
  sh.popd()
  tests = process.env.TEST_SERIES === '1' ?
    series(...tests.map(t => t[1]).value()) :
    concurrent(tests.fromPairs().value())
  if (process.env.CIRCLECI) {
    tests = series(mkdirp('reports'), tests)
  }
  sh.config.silent = silent
  return [cmd, series('nps build', tests)]
})

module.exports = {
  scripts: {
    build: 'rm -rf lib && tsc',
    lint: {
      default: concurrent.nps('lint.eslint', 'lint.tsc'),
      eslint: script('eslint . --ext .ts --config .eslintrc', 'lint js & ts files'),
      tsc: script('tsc --noEmit', 'syntax check with tsc'),
    },
    test: Object.assign({
      default: series.nps(...testTypes.map(t => `test.${t}`)),
    }, _.fromPairs(tests)),
  },
}
