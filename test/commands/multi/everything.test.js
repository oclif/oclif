const sh = require('shelljs')
const run = require('../../run')

describe('multi', () => {
  run('multi', 'everything')
    .retries(2).it(() => {
      sh.exec('node ./bin/run version')
      sh.exec('node ./bin/run hello')
    })
})
