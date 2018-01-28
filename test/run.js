const {test} = require('@dxcli/dev-test')
const path = require('path')
const sh = require('shelljs')
const npmPath = require('npm-run-path')
const tmp = require('tmp')

sh.set('-ev')

// remove CI env var so tests don't run nyc
const {CI} = process.env
delete process.env.CI

module.exports = (type, features) => {
  return test
    .retries(CI ? 1 : 0)
    .do(ctx => {
      process.chdir(path.join(__dirname, '..'))
      let options = ''
      if (features === 'everything') options = '--options=typescript,mocha,semantic-release'
      if (features === 'typescript') options = '--options=typescript'
      if (features === 'mocha') options = '--options=mocha'
      let dir = CI ? tmp.tmpNameSync() : path.join(__dirname, '../tmp')
      dir = path.join(dir, type, features)
      sh.rm('-rf', dir)
      sh.exec(`node ./bin/run ${type} ${dir} --defaults ${options}`)
      sh.cd(dir)
      sh.exec('git add .')
      sh.exec('git commit -nm init')
      sh.exec('git checkout -B origin/master')
      sh.exec('yarn test')
      sh.exec('yarn run precommit')
      ctx.dir = dir
      process.env = npmPath.env({env: process.env})
      ctx.expectation = `build ${type} with ${features}`

      switch (features) {
        case 'typescript':
          sh.exec('nps build')
          break
      }
    })
}
