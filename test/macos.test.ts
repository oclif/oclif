import {test} from '@oclif/test'
import * as qq from 'qqjs'

const pjson = require('../package.json')
const pjsonPath = require.resolve('../package.json')
const originalVersion = pjson.version

const onlyMacos = process.platform === 'darwin' ? test : test.skip()
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:macos', () => {
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

  onlyMacos
  .command(['pack:macos'])
  .command(['publish:macos'])
  .it('publishes valid releases', async () => {
    await qq.download(`https://oclif-staging.s3.amazonaws.com/channels/${testRun}/oclif-dev.pkg`)
  })
})
