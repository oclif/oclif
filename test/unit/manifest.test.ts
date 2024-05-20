import {Interfaces} from '@oclif/core'
import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {rm} from 'node:fs/promises'

describe('manifest', () => {
  beforeEach(async () => {
    await rm('oclif.manifest.json', {force: true})
  })

  afterEach(async () => {
    await rm('oclif.manifest.json', {force: true})
  })

  it('should generate manifest', async () => {
    const {result, stdout} = await runCommand<Interfaces.Manifest>('manifest')
    expect(stdout).to.match(/wrote manifest to .*oclif.manifest.json/)
    expect(result?.commands.manifest).to.deep.include({
      description: 'Generates plugin manifest json (oclif.manifest.json).',
    })
  })
})
