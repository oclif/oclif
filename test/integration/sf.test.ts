import {Interfaces} from '@oclif/core'
import {expect} from 'chai'
import {execSync} from 'node:child_process'
import {access, mkdir, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

describe('sf', () => {
  describe('manifest', () => {
    const testDir = join(tmpdir(), 'sf-manifest-integration-test')
    const sfDir = join(testDir, 'cli')

    before(async () => {
      if (await exists(testDir)) {
        await rm(testDir, {force: true, recursive: true})
      }

      await mkdir(testDir, {recursive: true})
      execSync(`git clone https://github.com/salesforcecli/cli.git`, {cwd: testDir})
      execSync('yarn --ignore-scripts', {cwd: sfDir})
      execSync('yarn build', {cwd: sfDir})
    })

    it('should generate manifest with JIT plugins', async () => {
      const binDev =
        process.platform === 'win32' ? join(process.cwd(), 'bin', 'dev.cmd') : join(process.cwd(), 'bin', 'dev.js')

      execSync(`${binDev} manifest`, {cwd: sfDir})

      const manifest = JSON.parse(await readFile(join(sfDir, 'oclif.manifest.json'), 'utf8')) as Interfaces.Manifest

      const sfPjson = JSON.parse(await readFile(join(sfDir, 'package.json'), 'utf8')) as Interfaces.PJSON['Plugin']
      const jitPlugins = Object.keys(sfPjson.oclif.jitPlugins ?? {})

      const everyPluginHasCommand = jitPlugins.every((jitPlugin) =>
        // eslint-disable-next-line max-nested-callbacks
        Boolean(Object.values(manifest.commands).some((command) => command.pluginName === jitPlugin)),
      )
      const everyJITCommandIsTypeJIT = Object.values(manifest.commands)
        .filter((command) => jitPlugins.includes(command.pluginName ?? ''))
        .every((command) => command.pluginType === 'jit')

      expect(everyPluginHasCommand).to.be.true
      expect(everyJITCommandIsTypeJIT).to.be.true
    })
  })
})
