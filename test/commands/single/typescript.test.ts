import * as sh from 'shelljs'

import run from '../../run'

describe('single', () => {
  run('single', 'typescript')
  .it(() => {
    sh.exec('node ./bin/run')
  })
})
