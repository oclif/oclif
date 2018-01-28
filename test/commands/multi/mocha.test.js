const sh = require('shelljs')
const run = require('../../run')

describe('multi', () => {
  run('multi', 'mocha')
    .it(() => {
      sh.exec('node ./bin/run version')
      sh.exec('node ./bin/run hello')
    })
})
