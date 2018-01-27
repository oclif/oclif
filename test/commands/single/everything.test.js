const sh = require('shelljs')

const run = require('../../run')

describe('single', () => {
  run('single', 'everything')
    .it(() => {
      sh.exec('node ./bin/run')
    })
})
