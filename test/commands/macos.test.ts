import {test} from '@oclif/test'
import * as qq from 'qqjs'
import {findDistFileSha, oclifTestingVersionsURI, devSalesforceoclifTestingVersionsURI} from '../helpers/helper'

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version

const onlyMacos = process.platform === 'darwin' ? test : test.skip()
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:macos', () => {
  const cwd = process.cwd()
  let pkg: string
  let sha: string
  beforeEach(async () => {
    pjson.version = `${pjson.version}-${testRun}`
    await qq.x(`aws s3 rm --recursive s3://${oclifTestingVersionsURI}/${pjson.version}`)
    await qq.writeJSON(pjsonPath, pjson)
    const root = qq.join(__dirname, '../tmp/test/publish')
    await qq.emptyDir(root)
    qq.cd(root)
  })
  afterEach(async () => {
    await qq.x(`aws s3 rm --recursive s3://${oclifTestingVersionsURI}/${pjson.version}`)
    qq.cd([__dirname, '..'])
    pjson.version = originalVersion
    await qq.writeJSON(pjsonPath, pjson)
  })

  onlyMacos
  .command(['pack:macos'])
  .do(async () => {
    [pkg, sha] = await findDistFileSha(cwd, f => f.endsWith('pkg'))
  })
  .command(['upload:macos'])
  .it('publishes valid releases', async () => {
    await qq.download(`https://${devSalesforceoclifTestingVersionsURI}/${pjson.version}/${sha}/${pkg}`)
  })
})
