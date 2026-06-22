import {Interfaces} from '@oclif/core'
import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import fs from 'node:fs'
import {rm} from 'node:fs/promises'
import path from 'node:path'

describe('manifest', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = process.cwd()
    await rm('oclif.manifest.json', {force: true})
  })

  afterEach(async () => {
    await rm('oclif.manifest.json', {force: true})
    process.chdir(cwd)
  })

  it('should generate manifest', async () => {
    const {result, stdout} = await runCommand<Interfaces.Manifest>('manifest')
    expect(stdout).to.match(/wrote manifest to .*oclif.manifest.json/)
    expect(result?.commands.manifest).to.deep.include({
      description: 'Generates plugin manifest json (oclif.manifest.json).',
    })
  })

  it('should generate jit plugins', async () => {
    const {error, result: manifest} = await runCommand<Interfaces.Manifest>(
      `manifest ${path.join(__dirname, '../fixtures/cli-with-jit-plugin')}`,
    )
    const jitPlugins = ['oclif']

    const everyPluginHasCommand = jitPlugins.every((jitPlugin) =>
      Boolean(Object.values(manifest?.commands ?? []).some((command) => command.pluginName === jitPlugin)),
    )
    const everyJITCommandIsTypeJIT = Object.values(manifest?.commands ?? [])
      .filter((command) => jitPlugins.includes(command.pluginName ?? ''))
      .every((command) => command.pluginType === 'jit')

    expect(everyPluginHasCommand).to.be.true
    expect(everyJITCommandIsTypeJIT).to.be.true
    expect(manifest?.commands.hello).to.be.ok
    expect(error).to.be.undefined
  })

  it('is not vulnerable to command injection via JIT plugins', async () => {
    // Verify that the malicious plugin is planning to write to the right file.
    expect(
      fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'cli-with-malicious-jit-plugin', 'package.json'), 'utf8'),
    ).to.contain('> ATTACK_SUCCEEDED.txt')

    await runCommand<Interfaces.Manifest>(
      `manifest ${path.join(__dirname, '../fixtures/cli-with-malicious-jit-plugin')}`,
    )

    expect(fs.existsSync(path.join(__dirname, '..', '..', 'ATTACK_SUCCEEDED.txt'))).to.equal(false)
  })
})
