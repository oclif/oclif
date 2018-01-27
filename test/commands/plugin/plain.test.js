const sh = require('shelljs')

const run = require('../../run')

describe('plugin', () => {
  run('plugin', 'plain')
    .retries(2)
    .it(() => {
      sh.exec('node ./bin/run hello')
    })
})
