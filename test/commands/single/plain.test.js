const sh = require('shelljs')

const run = require('../../run')

describe('single', () => {
  run('single', 'plain')
    .it(() => {
      sh.exec('node ./bin/run')
    })
})
