import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {emptyDir, readFile, writeJSON} from 'fs-extra'
import _ from 'lodash'
import {createWriteStream} from 'node:fs'
import path from 'node:path'
import {pipeline} from 'node:stream/promises'
import {exec} from 'shelljs'

const pjson = require('../../package.json')
import {deleteFolder, developerSalesforceCom, findDistFileSha} from '../helpers/helper'
const pjsonPath = require.resolve('../../package.json')
// eslint-disable-next-line unicorn/prefer-structured-clone
const originalPJSON = _.cloneDeep(pjson)

const onlyMacos = process.platform === 'darwin' ? it : it.skip
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('macos', () => {
  const cwd = process.cwd()

  describe('pack', () => {
    onlyMacos('resolves the installing user home in uninstall script', async () => {
      await runCommand('pack macos')

      const uninstallScript = await readFile(path.join(cwd, 'tmp', 'darwin-arm64', 'oclif', 'bin', 'uninstall'), 'utf8')
      const dollar = '$'
      const shellParamExpansion = (expression: string) => `${dollar}{${expression}}`

      expect(uninstallScript).to.contain(
        `REAL_USER="${shellParamExpansion('SUDO_USER:-$(logname 2>/dev/null || id -un)')}"`,
      )
      expect(uninstallScript).to.contain('REAL_HOME=$(eval echo "~$REAL_USER")')
      expect(uninstallScript).to.contain(
        `DATA_DIR="${shellParamExpansion('OCLIF_DATA_DIR:-$REAL_HOME/.local/share/oclif')}"`,
      )
      expect(uninstallScript).to.contain(
        `CACHE_DIR="${shellParamExpansion('OCLIF_CACHE_DIR:-$REAL_HOME/Library/Caches/oclif')}"`,
      )
      expect(uninstallScript).to.contain(
        `CONFIG_DIR="${shellParamExpansion('OCLIF_CONFIG_DIR:-$REAL_HOME/.config/oclif')}"`,
      )
      expect(uninstallScript).to.contain('[ -e "$DATA_DIR" ] && rm -rf "$DATA_DIR"')
      expect(uninstallScript).to.contain('[ -e "$CACHE_DIR" ] && rm -rf "$CACHE_DIR"')
      expect(uninstallScript).to.contain('[ -e "$CONFIG_DIR" ] && rm -rf "$CONFIG_DIR"')
      expect(uninstallScript).to.not.contain(process.env.HOME!)
    })
  })

  describe('publish', () => {
    let pkg: string
    let sha: string
    let bucket: string
    let basePrefix: string
    const root = path.join(__dirname, '../tmp/test/publish')

    beforeEach(async () => {
      pjson.version = `${pjson.version}-${testRun}`
      pjson.oclif.update.node.version = process.versions.node
      pjson.oclif.binAliases = ['oclif2']
      bucket = pjson.oclif.update.s3.bucket
      basePrefix = pjson.oclif.update.s3.folder
      await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
      await writeJSON(pjsonPath, pjson, {spaces: 2})
      await emptyDir(root)
    })

    afterEach(async () => {
      if (!process.env.PRESERVE_ARTIFACTS) {
        await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
      }

      await writeJSON(pjsonPath, originalPJSON, {spaces: 2})
    })

    onlyMacos('publishes valid releases', async () => {
      await runCommand('pack macos')

      // install the intel silicon pkg
      ;[pkg, sha] = await findDistFileSha(cwd, 'macos', (f) => f.endsWith('x64.pkg'))
      exec(`sudo installer -pkg ${path.join(cwd, 'dist', 'macos', pkg)} -target /`)
      expect(exec('oclif --version').stdout).to.contain(`oclif/${pjson.version}`)
      // tests binAlias
      expect(exec('oclif2 --version').stdout).to.contain(`oclif/${pjson.version}`)

      await runCommand('upload macos')

      const {default: got} = await import('got')
      await pipeline(
        got.stream(`https://${developerSalesforceCom}/${basePrefix}/versions/${pjson.version}/${sha}/${pkg}`),
        createWriteStream(pkg),
      )
    })
  })
})
