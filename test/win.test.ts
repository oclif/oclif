import {test} from '@oclif/test'
import * as qq from 'qqjs'
import * as path from 'path'

const skipIfWindows = process.platform === 'win32' ? test.skip() : test
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:win', () => {
  let pjson: any
  let pjsonPath: string
  let originalVersion: string
  beforeEach(async () => {
    // eslint-disable-next-line unicorn/prefer-module
    pjson = require('../package.json')
    // eslint-disable-next-line unicorn/prefer-module
    pjsonPath = require.resolve('../package.json')
    originalVersion = pjson.version
    await qq.x(`aws s3 rm --recursive s3://oclif-staging/channels/${testRun}`)
    pjson.version = `${pjson.version}-${testRun}`
    await qq.writeJSON(pjsonPath, pjson)
    const root = path.join(__dirname, '..', 'tmp', 'test', 'publish')
    await qq.emptyDir(root)
    qq.cd(root)
  })
  afterEach(async () => {
    await qq.x(`aws s3 rm --recursive s3://oclif/dev-cli/channels/${testRun}`)
    qq.cd(path.join(__dirname, '..'))
    pjson.version = originalVersion
    await qq.writeJSON(pjsonPath, pjson)
  })

  skipIfWindows
  .command(['pack:win'])
  .command(['publish:win'])
  .it('publishes valid releases', async () => {
    await qq.download(`https://oclif-staging.s3.amazonaws.com/channels/${testRun}/oclif-x64.exe`)
    await qq.download(`https://oclif-staging.s3.amazonaws.com/channels/${testRun}/oclif-x86.exe`)
  })
})
