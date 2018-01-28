const {test} = require('@dxcli/test')
const path = require('path')
const sh = require('shelljs')
const npmPath = require('npm-run-path')
const tmp = require('tmp')

sh.set('-ev')

// remove CI env var so tests don't run nyc
const {CI} = process.env
delete process.env.CI

function generate (args) {
  const run = path.join(__dirname, '../bin/run')
  sh.exec(`node ${run} ${args}`)
}

function build (type, features) {
  let options = ''
  if (features === 'everything') options = '--options=typescript,mocha,semantic-release'
  if (features === 'typescript') options = '--options=typescript'
  if (features === 'mocha') options = '--options=mocha'
  let dir = CI ? tmp.tmpNameSync() : path.join(__dirname, '../tmp')
  dir = path.join(dir, type, features)
  sh.rm('-rf', dir)
  generate(`${type} ${dir} --defaults ${options}`)
  sh.cd(dir)
  sh.exec('git add .')
  sh.exec('git commit -nm init')
  sh.exec('git checkout -B origin/master')
  process.env = npmPath.env({env: process.env})
}

module.exports = file => {
  const f = path.parse(file)
  const [name] = f.name.split('.')
  const cmd = path.basename(f.dir)

  describe(cmd, () => {
    test
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
            break
          case 'single':
            build(cmd, name)
            sh.exec('node ./bin/run')
            sh.exec('yarn test')
            break
          case 'multi':
            build(cmd, name)
            sh.exec('node ./bin/run version')
            sh.exec('node ./bin/run hello')
            sh.exec('yarn test')
            break
          case 'command':
            build('plugin', name)
            generate('command foo:bar:baz --defaults --force')
            sh.exec('node ./bin/run hello')
            sh.exec('node ./bin/run foo:bar:baz')
            sh.exec('yarn test')
            break
        }
      })
      .it([cmd, name].join(':'))
  })
}
