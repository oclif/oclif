const sh = require('shelljs')

const run = require('../../run')

describe('plugin', () => {
  run('plugin', 'everything')
    .it(() => {
      sh.exec('node ./bin/run hello')
    })
})
