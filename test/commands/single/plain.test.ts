import * as sh from 'shelljs'

import run from '../../run'

describe('single', () => {
  run('single', 'plain')
  .it(() => {
    sh.exec('node ./bin/run')
  })
})
