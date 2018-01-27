const sh = require('shelljs')

const run = require('../../run')

describe('plugin', () => {
  run('plugin', 'mocha')
    .retries(2)
    .it(() => {
      sh.exec('node ./bin/run hello')
    })
})
