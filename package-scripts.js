const {
  concurrent,
  series,
  setColors,
  mkdirp,
} = require('nps-utils')
const script = (script, description) => description ? {script, description} : {script}
const hidden = script => ({script, hiddenFromHelp: true})

setColors(['dim'])

let test = type => {
  let mocha = () => 'mocha --forbid-only'
  if (process.env.CIRCLECI) {
    const m = mocha()
    mocha = type => `MOCHA_FILE=reports/mocha-${type}.xml ${m} --reporter mocha-junit-reporter`
  }

  let tests = concurrent([
    `${mocha('plain')} test/commands/${type}/plain.test.ts`,
    `${mocha('mocha')} test/commands/${type}/mocha.test.ts`,
    `${mocha('typescript')} test/commands/${type}/typescript.test.ts`,
    `${mocha('everything')} test/commands/${type}/everything.test.ts`,
  ])
  if (process.env.CI) {
    const nyc = 'nyc --nycrc-path node_modules/@dxcli/dev-nyc-config/.nycrc'
    return series(mkdirp('reports'), `${nyc} ${tests}`, `${nyc} report --reporter text-lcov > coverage.lcov`)
  }
  return tests
}

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
      default: series.nps('test.base', 'test.plugin', 'test.single', 'test.multi'),
      base: test('base'),
      plugin: test('plugin'),
      single: test('single'),
      multi: test('multi'),
    },
    release: hidden('semantic-release -e @dxcli/dev-semantic-release'),
  },
}
