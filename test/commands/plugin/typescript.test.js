const sh = require('shelljs')

const run = require('../../run')

describe('plugin', () => {
  run('plugin', 'typescript')
    .it(() => {
      sh.exec('node ./bin/run hello')
    })
})
