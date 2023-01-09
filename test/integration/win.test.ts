import {expect, test} from '@oclif/test'
import {deleteFolder, developerSalesforceCom, findDistFileSha, oclifTestingVersionsURI} from '../helpers/helper'
import {gitSha} from '../../src/tarballs'
import * as path from 'path'
import * as fs from 'fs-extra'
import {promisify} from 'node:util'
import {pipeline as pipelineSync} from 'node:stream'
import got from 'got'

const pipeline = promisify(pipelineSync)

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version

const skipIfWindows = process.platform === 'win32' ? test.skip() : test
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:win', () => {
  let pkg: string
  let sha: string
  let bucket: string
  let basePrefix: string
  const root = path.join(__dirname, '../tmp/test/publish')

  beforeEach(async () => {
    sha = await gitSha(process.cwd(), {short: true})
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

  skipIfWindows
  .command(['pack:win'])
  .command(['upload:win'])
  .do(async () => {
    [pkg, sha] = await findDistFileSha(process.cwd(), 'win32', f => f.endsWith('x64.exe'))
    expect(pkg).to.be.ok
    expect(sha).to.be.ok
  })
  .it('publishes valid releases', async () => {
    await pipeline(
      got.stream(`https://${developerSalesforceCom}/${oclifTestingVersionsURI}/${pjson.version}/${sha}/${pkg}`),
      fs.createWriteStream(pkg),
    )
  })
})
