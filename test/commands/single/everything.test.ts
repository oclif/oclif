import * as sh from 'shelljs'

import run from '../../run'

describe('single', () => {
  run('single', 'everything')
  .it(() => {
    sh.exec('node ./bin/run')
  })
})
