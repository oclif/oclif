import * as Config from '@oclif/config'
import {expect, test} from '@oclif/test'
import * as fs from 'fs-extra'

describe('manifest', () => {
  test
  .stdout()
  .do(() => fs.remove('oclif.manifest.json'))
  .finally(() => fs.remove('oclif.manifest.json'))
  .command(['manifest'])
  .it('outputs plugins', ctx => {
    const {commands} = fs.readJSONSync('oclif.manifest.json') as Config.Manifest
    expect(commands.manifest).to.include({
      description: 'generates plugin manifest json',
    })
    expect(ctx.stdout).to.match(/wrote manifest to .*oclif.manifest.json/)
  })
})
