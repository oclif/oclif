import * as sh from 'shelljs'

import run from '../../run'

describe('multi', () => {
  run('multi', 'plain')
  .it(() => {
    sh.exec('node ./bin/run version')
    sh.exec('node ./bin/run hello')
  })
})
