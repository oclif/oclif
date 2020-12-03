import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'

import {gitSha} from '../src/tarballs'

const pjson = require('../package.json')
const pjsonPath = require.resolve('../package.json')
const originalVersion = pjson.version
const target = [process.platform, process.arch].join('-')

const onlyLinux = process.platform === 'linux' ? test : test.skip()
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:deb', () => {
  beforeEach(async () => {
    await qq.x(`aws s3 rm --recursive s3://oclif-staging/channels/${testRun}`)
    pjson.version = `${pjson.version}-${testRun}`
    await qq.writeJSON(pjsonPath, pjson)
    const root = qq.join(__dirname, '../tmp/test/publish')
    await qq.emptyDir(root)
    qq.cd(root)
  })
  afterEach(async () => {
    await qq.x(`aws s3 rm --recursive s3://oclif/dev-cli/channels/${testRun}`)
    qq.cd([__dirname, '..'])
    pjson.version = originalVersion
    await qq.writeJSON(pjsonPath, pjson)
  })

  onlyLinux
  .command(['pack:deb'])
  .command(['publish:deb'])
  .it('publishes valid releases', async () => {
    const sha = await gitSha(process.cwd(), {short: true})
    qq.cd([__dirname, '..'])
    await qq.x('cat test/release.key | apt-key add -')
    await qq.x(`echo "deb https://oclif-staging.s3.amazonaws.com/channels/${testRun}/apt ./" > /etc/apt/sources.list.d/oclif.list`)
    await qq.x('apt-get update')
    await qq.x('apt-get install -y oclif')
    await qq.x('oclif --version')
    const stdout = await qq.x.stdout('oclif', ['--version'])
    expect(stdout).to.contain(`oclif/${pjson.version}.${sha} ${target} node-v${pjson.oclif.update.node.version}`)
  })
})
