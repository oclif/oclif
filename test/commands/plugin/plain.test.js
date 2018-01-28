const sh = require('shelljs')

const run = require('../../run')

describe('plugin', () => {
  run('plugin', 'plain')
    .it(() => {
      sh.exec('node ./bin/run hello')
    })
})
