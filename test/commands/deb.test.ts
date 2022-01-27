import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'
import {developerSalesforceCom, oclifTestingChannelsURI, oclifTestingVersionsURI} from '../helpers/helper'
import {gitSha} from '../../src/tarballs'

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version
const target = [process.platform, process.arch].join('-')

const onlyLinux = process.platform === 'linux' ? test : test.skip()
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:deb', () => {
  beforeEach(async () => {
    pjson.version = `${pjson.version}-${testRun}`
    await qq.x(`aws s3 rm --recursive s3://${oclifTestingVersionsURI}/${pjson.version}`)
    await qq.x(`aws s3 rm --recursive s3://${oclifTestingChannelsURI}/`)
    await qq.writeJSON(pjsonPath, pjson)
    const root = qq.join(__dirname, '../tmp/test/publish')
    await qq.emptyDir(root)
    qq.cd(root)
  })
  afterEach(async () => {
    await qq.x(`aws s3 rm --recursive s3://${oclifTestingVersionsURI}/${pjson.version}`)
    await qq.x(`aws s3 rm --recursive s3://${oclifTestingChannelsURI}/`)
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
