import {test} from '@oclif/test'
import {findDistFileSha, developerSalesforceCom, deleteFolder} from '../helpers/helper'
import * as fs from 'fs-extra'
import * as path from 'path'
import {promisify} from 'node:util'
import {pipeline as pipelineSync} from 'node:stream'
import got from 'got'

const pipeline = promisify(pipelineSync)
const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version

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
    bucket = pjson.oclif.update.s3.bucket
    basePrefix = pjson.oclif.update.s3.folder
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    await fs.writeJSON(pjsonPath, pjson, {spaces: 2})
    await fs.emptyDir(root)
  })
  afterEach(async () => {
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    pjson.version = originalVersion
    await fs.writeJSON(pjsonPath, pjson, {spaces: 2})
  })

  onlyMacos
  .command(['pack:macos'])
  .do(async () => {
    [pkg, sha] = await findDistFileSha(cwd, 'macos', f => f.endsWith('pkg'))
  })
  .command(['upload:macos'])
  .it('publishes valid releases', async () => {
    await pipeline(
      got.stream(`https://${developerSalesforceCom}/${basePrefix}/versions/${pjson.version}/${sha}/${pkg}`),
      fs.createWriteStream(pkg),
    )
  })
})
