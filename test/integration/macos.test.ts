import {test} from '@oclif/test'
import * as qq from 'qqjs'
import {findDistFileSha, developerSalesforceCom, deleteFolder} from '../helpers/helper'

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

  onlyMacos
  .command(['pack:macos'])
  .do(async () => {
    [pkg, sha] = await findDistFileSha(cwd, 'macos', f => f.endsWith('pkg'))
  })
  .command(['upload:macos'])
  .it('publishes valid releases', async () => {
    await qq.download(`https://${developerSalesforceCom}/${basePrefix}/versions/${pjson.version}/${sha}/${pkg}`)
  })
})
