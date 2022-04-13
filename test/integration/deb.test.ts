import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'
import {deleteFolder, developerSalesforceCom} from '../helpers/helper'
import {gitSha} from '../../src/tarballs'

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version
const target = [process.platform, process.arch].join('-')

const onlyLinux = process.platform === 'linux' ? test : test.skip()
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

// 2022-01 - this test requires linux with apt-ftparchive installed. Current CircleCi images do not have that util installed - skipping test
describe.skip('publish:deb', () => {
  let bucket: string
  let basePrefix: string

  beforeEach(async () => {
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

  onlyLinux
  .command(['pack:deb'])
  .command(['upload:deb'])
  .it('publishes valid releases', async () => {
    const sha = await gitSha(process.cwd(), {short: true})
    qq.cd([__dirname, '..', '..'])
    await qq.x('cat test/release.key | apt-key add -')
    await qq.x(`echo "deb https://${developerSalesforceCom}/apt ./" > /etc/apt/sources.list.d/oclif-dev.list`)
    await qq.x('apt-get update')
    await qq.x('apt-get install -y oclif-dev')
    await qq.x('oclif --version')
    const stdout = await qq.x.stdout('oclif', ['--version'])
    expect(stdout).to.contain(`oclif/${pjson.version}.${sha} ${target} node-v${pjson.oclif.update.node.version}`)
  })
})
