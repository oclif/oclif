const {test} = require('@dxcli/dev-test')
const path = require('path')
const sh = require('shelljs')
const npmPath = require('npm-run-path')

sh.set('-ev')

process.env.DXCLI_TESTING = '1'

module.exports = (type, features) => {
  return test
    .do(ctx => {
      process.chdir(path.join(__dirname, '..'))
      let options = ''
      if (features === 'everything') options = '--options=typescript,mocha,semantic-release'
      if (features === 'typescript') options = '--options=typescript'
      if (features === 'mocha') options = '--options=mocha'
      let dir = path.join(__dirname, `../tmp/test-${type}/${features}`)
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
    })
}
