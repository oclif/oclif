import {expect, test} from '@oclif/test'
import {deleteFolder, developerSalesforceCom, findDistFileSha} from '../helpers/helper'
import * as fs from 'fs-extra'
import * as path from 'path'
import {promisify} from 'node:util'
import {pipeline as pipelineSync} from 'node:stream'
import got from 'got'
import {exec} from 'shelljs'
import * as _ from 'lodash'

const pipeline = promisify(pipelineSync)
const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalPJSON = _.cloneDeep(pjson)

const onlyMacos = process.platform === 'darwin' ? test : test.skip()
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
    await fs.writeJSON(pjsonPath, pjson, {spaces: 2})
    await fs.emptyDir(root)
  })
  afterEach(async () => {
    if (!process.env.PRESERVE_ARTIFACTS) {
      await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    }

    await fs.writeJSON(pjsonPath, originalPJSON, {spaces: 2})
  })

  onlyMacos
  .command(['pack:macos'])
  .do(async () => {
    // install the intel silicon pkg
    [pkg, sha] = await findDistFileSha(cwd, 'macos', f => f.endsWith('x64.pkg'))
    await exec(`sudo installer -pkg ${path.join(cwd, 'dist', 'macos', pkg)} -target /`)
    expect(exec('oclif --version').stdout).to.contain(`oclif/${pjson.version}`)
    // tests binAlias
    expect(exec('oclif2 --version').stdout).to.contain(`oclif/${pjson.version}`)
  })
  .command(['upload:macos'])
  .it('publishes valid releases', async () => {
    await pipeline(
      got.stream(`https://${developerSalesforceCom}/${basePrefix}/versions/${pjson.version}/${sha}/${pkg}`),
      fs.createWriteStream(pkg),
    )
  })
})
