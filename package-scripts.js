const {
  concurrent,
  crossEnv,
  series,
  setColors,
} = require('nps-utils')
const script = (script, description) => description ? {script, description} : {script}
const hidden = script => ({script, hiddenFromHelp: true})

setColors(['dim'])

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
      default: script(concurrent.nps('lint', 'test.mocha'), 'lint and run all tests'),
      series: script(series.nps('lint', 'test.mocha'), 'lint and run all tests in series'),
      mocha: {
        default: script('mocha --forbid-only "test/**/*.test.ts"', 'run all mocha tests'),
        coverage: {
          default: hidden(series.nps('test.mocha.nyc nps test.mocha', 'test.mocha.coverage.report')),
          report: hidden(series('nps "test.mocha.nyc report --reporter text-lcov" > coverage.lcov')),
        },
        junit: hidden(series(
          crossEnv('MOCHA_FILE="reports/mocha.xml" ') + series.nps('test.mocha.nyc nps \\"test.mocha --reporter mocha-junit-reporter\\"'),
          series.nps('test.mocha.coverage.report'),
        )),
        nyc: hidden('nyc --nycrc-path node_modules/@dxcli/dev-nyc-config/.nycrc'),
      },
    },
    release: hidden('semantic-release -e @dxcli/dev-semantic-release'),
  },
}
