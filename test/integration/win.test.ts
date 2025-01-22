import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {emptyDir, writeJSON} from 'fs-extra'
import {createWriteStream} from 'node:fs'
import path from 'node:path'
import {pipeline} from 'node:stream/promises'

const pjson = require('../../package.json')
import {gitSha} from '../../src/tarballs'
import {deleteFolder, developerSalesforceCom, findDistFileSha, oclifTestingVersionsURI} from '../helpers/helper'
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version

const skipIfWindows = process.platform === 'win32' ? it.skip : it
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
    await writeJSON(pjsonPath, pjson, {spaces: 2})
    await emptyDir(root)
  })

  afterEach(async () => {
    if (!process.env.PRESERVE_ARTIFACTS) {
      // set this env var to keep the packed windows CLI in the bucket
      // useful for downloading and testing the CLI on windows
      await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
      pjson.version = originalVersion
      await writeJSON(pjsonPath, pjson, {spaces: 2})
    }
  })

  skipIfWindows('publishes valid releases', async () => {
    await runCommand('pack win')
    await runCommand('upload win')
    ;[pkg, sha] = await findDistFileSha(process.cwd(), 'win32', (f) => f.endsWith('x64.exe'))
    expect(pkg).to.be.ok
    expect(sha).to.be.ok

    console.log(`https://${developerSalesforceCom}/${oclifTestingVersionsURI}/${pjson.version}/${sha}/${pkg}`)
    const {default: got} = await import('got')
    await pipeline(
      got.stream(`https://${developerSalesforceCom}/${oclifTestingVersionsURI}/${pjson.version}/${sha}/${pkg}`),
      createWriteStream(pkg),
    )
  })
})
