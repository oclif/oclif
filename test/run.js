const {fancy} = require('fancy-test')
const path = require('path')
const sh = require('shelljs')
const npmPath = require('npm-run-path')
const tmp = require('tmp')
const os = require('os')

sh.set('-ev')

// remove CI env var so tests don't run nyc
const {CI} = process.env
delete process.env.CI
process.env.OCLIF_DEBUG = '1'

process.env.YARN_MUTEX = `file:${path.join(os.tmpdir(), 'yarn.mutex')}`

function generate(args) {
  const run = path.join(__dirname, '../bin/run')
  sh.exec(`node ${run} ${args}`)
}

function build(type, features) {
  let options = ''
  if (features === 'everything') options = '--options=yarn,typescript,eslint,mocha'
  if (features === 'typescript') options = '--options=yarn,typescript'
  if (features === 'mocha') options = '--options=yarn,mocha'
  let dir = CI ? tmp.tmpNameSync() : path.join(__dirname, '../tmp')
  dir = path.join(dir, type, features)
  sh.rm('-rf', dir)
  generate(`${type} ${dir} --defaults ${options}`)
  sh.cd(dir)
  // sh.exec('git add .')
  // sh.exec('git commit -nm init')
  // sh.exec('git checkout -B origin/master')
  process.env = npmPath.env({env: process.env})
}

module.exports = file => {
  const f = path.parse(file)
  const [name] = f.name.split('.')
  const cmd = path.basename(f.dir)

  describe(cmd, () => {
    fancy
    .retries(CI ? 1 : 0)
    .do(() => {
      switch (cmd) {
      case 'base':
        build(cmd, name)
        sh.exec('yarn test')
        break
      case 'plugin':
        build(cmd, name)
        sh.exec('yarn test')
        sh.exec('node ./bin/run hello')
        sh.exec('node ./bin/run')
        sh.exec('node ./bin/run --help')
        sh.exec('npm pack --unsafe-perm')
        break
      case 'single':
        build(cmd, name)
        sh.exec('yarn test')
        sh.exec('node ./bin/run -v')
        sh.exec('node ./bin/run')
        sh.exec('node ./bin/run --help')
        break
      case 'multi':
        build(cmd, name)
        sh.exec('yarn test')
        sh.exec('node ./bin/run -v')
        sh.exec('node ./bin/run version')
        sh.exec('node ./bin/run hello')
        sh.exec('node ./bin/run help hello')
        sh.exec('node ./bin/run hello --help')
        sh.exec('npm pack --unsafe-perm')
        break
      case 'command':
        build('plugin', name)
        generate('command foo:bar:baz --defaults --force')
        sh.exec('yarn test')
        sh.exec('node ./bin/run hello')
        sh.exec('node ./bin/run foo:bar:baz')
        sh.exec('node ./bin/run help foo:bar:baz')
        sh.exec('node ./bin/run foo:bar:baz --help')
        sh.exec('npm pack --unsafe-perm')
        break
      case 'hook':
        build('plugin', name)
        generate('hook myhook --defaults --force')
        sh.exec('yarn test')
        sh.exec('node ./bin/run hello')
        sh.exec('npm pack --unsafe-perm')
        break
      }
    })
    .it([cmd, name].join(':'))
  })
}
