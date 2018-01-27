const sh = require('shelljs')

const run = require('../../run')

describe('single', () => {
  run('single', 'typescript')
    .it(() => {
      sh.exec('node ./bin/run')
    })
})
