import * as sh from 'shelljs'

import run from '../../run'

describe('single', () => {
  run('single', 'mocha')
  .it(() => {
    sh.exec('node ./bin/run')
  })
})
