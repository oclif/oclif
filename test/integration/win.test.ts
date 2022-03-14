import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'
import {deleteFolder, developerSalesforceCom, findDistFileSha, oclifTestingVersionsURI} from '../helpers/helper'
import {gitSha} from '../../src/tarballs'

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
  const cwd = process.cwd()

  beforeEach(async () => {
    sha = await gitSha(process.cwd(), {short: true})
    pjson.version = `${pjson.version}-${testRun}`
    pjson.oclif.update.node.version = process.versions.node
    bucket = pjson.oclif.update.s3.bucket
    basePrefix = pjson.oclif.update.s3.folder
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    await qq.writeJSON(pjsonPath, pjson)
    const root = qq.join(__dirname, '../tmp/test/publish')
    await qq.emptyDir(root)
    qq.cd(root)
  })
  afterEach(async () => {
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    qq.cd([__dirname, '..'])
    pjson.version = originalVersion
    await qq.writeJSON(pjsonPath, pjson)
  })

  skipIfWindows
  .command(['pack:win'])
  .command(['upload:win'])
  .do(async () => {
    [pkg, sha] = await findDistFileSha(cwd, 'win32', f => f.endsWith('x64.exe'))
    expect(pkg).to.be.ok
    expect(sha).to.be.ok
  })
  .it('publishes valid releases', async () => {
    await qq.download(`https://${developerSalesforceCom}/${oclifTestingVersionsURI}/${pjson.version}/${sha}/${pkg}`)
  })
})
