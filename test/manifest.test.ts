import {Interfaces} from '@oclif/core'

import {expect, test} from '@oclif/test'
import * as fs from 'fs-extra'

process.env.NODE_ENV = 'development'

describe('manifest', () => {
  test
  .stdout()
  .do(() => fs.remove('.oclif.manifest.json'))
  .finally(() => fs.remove('.oclif.manifest.json'))
  .command(['manifest'])
  .it('outputs plugins', ctx => {
    const {commands} = fs.readJSONSync('.oclif.manifest.json') as Interfaces.Manifest
    expect(commands.manifest).to.include({
      description: 'generates plugin manifest json',
    })
    expect(ctx.stdout).to.match(/wrote manifest to .*oclif.manifest.json/)
  })
})
