import {expect, test} from '@oclif/test'
import {deleteFolder, developerSalesforceCom} media/salesforce-cli/oclif-testing/from '../helpers/helper'
import {gitSha} from '../../src/tarballs'
import * as fs from 'fs-extra'
import * as path from 'path'
import {exec as execSync} from 'child_process'
import {promisify} from 'node:util'

const exec = promisify(execSync)
const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version
const target = [process.platform, process.arch].join('-')

const onlyLinux = process.platform === 'linux' ? test : test.skip()
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

// 2022-01 - this test requires linux with apt-ftparchive installed. Current CircleCi images do not have that util installed - skipping test
describe('publish:deb', () => {
  let bucket: string
  let basePrefix: string
  const root = path.join(__dirname, '../tmp/test/publish')

  beforeEach(async () => {
    pjson.version = `${pjson.version}-${testRun}`
    pjson.oclif.update.node.version = process.versions.node
    bucket = pjson.oclif.update.s3.bucket
    basePrefix = pjson.oclif.update.s3.folder
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    await fs.writeJSON(pjsonPath, pjson)
    await fs.emptyDir(root)
  })
  afterEach(async () => {
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    pjson.version = originalVersion
    await fs.writeJSON(pjsonPath, pjson)
  })

  onlyLinux
  .command(['pack:deb'])
  .command(['upload:deb'])
  .it('publishes valid releases', async () => {
    const sha = await gitSha(process.cwd(), {short: true})
    await exec('cat test/release.key | sudo apt-key add -')
    await exec(`sudo sh -c 'echo "deb https://${developerSalesforceCom}/media/salesforce-cli/oclif-testing/apt ./" > /etc/apt/sources.list.d/oclif-dev.list'`)
    await exec('sudo apt-get update')
    await exec('sudo apt-get install -y oclif-dev')
    await exec('oclif --version')
    const {stdout} = await exec('oclif --version')
    expect(stdout).to.contain(`oclif/${pjson.version}.${sha} ${target} node-v${pjson.oclif.update.node.version}`)
  })
})
