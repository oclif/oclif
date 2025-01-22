import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {emptyDir, writeJSON} from 'fs-extra'
import _ from 'lodash'
import {createWriteStream} from 'node:fs'
import path from 'node:path'
import {pipeline} from 'node:stream/promises'
import {exec} from 'shelljs'

const pjson = require('../../package.json')
import {deleteFolder, developerSalesforceCom, findDistFileSha} from '../helpers/helper'
const pjsonPath = require.resolve('../../package.json')
const originalPJSON = _.cloneDeep(pjson)

const onlyMacos = process.platform === 'darwin' ? it : it.skip
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:macos', () => {
  const cwd = process.cwd()
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
