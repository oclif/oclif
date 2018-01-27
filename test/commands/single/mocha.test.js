const sh = require('shelljs')

const run = require('../../run')

describe('single', () => {
  run('single', 'mocha')
    .retries(2).it(() => {
      sh.exec('node ./bin/run')
    })
})
