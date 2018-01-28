const sh = require('shelljs')

const run = require('../../run')

describe('single', () => {
  run('single', 'mocha')
    .it(() => {
      sh.exec('node ./bin/run')
    })
})
