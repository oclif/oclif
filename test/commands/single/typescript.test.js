const sh = require('shelljs')

const run = require('../../run')

describe('single', () => {
  run('single', 'typescript')
    .retries(2).it(() => {
      sh.exec('node ./bin/run')
    })
})
