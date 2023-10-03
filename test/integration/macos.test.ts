import {expect, test} from '@oclif/test'
import {emptyDir, writeJSON} from 'fs-extra'
import got from 'got'
import {createWriteStream} from 'node:fs'
import * as path from 'node:path'
import {pipeline} from 'node:stream/promises'
import {exec} from 'shelljs'

import {deleteFolder, developerSalesforceCom, findDistFileSha} from '../helpers/helper'
const cloneDeep = require('lodash.clonedeep')

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalPJSON = cloneDeep(pjson)

const onlyMacos = process.platform === 'darwin' ? test : test.skip()
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:macos', () => {
  const cwd = process.cwd()
  let pkg: string
  let sha: string
  let bucket: string
  let basePrefix: string
  const root = path.join(__dirname, '../tmp/test/publish')

  beforeEach(async () => {
    pjson.version = `${pjson.version}-${testRun}`
    pjson.oclif.update.node.version = process.versions.node
    pjson.oclif.binAliases = ['oclif2']
    bucket = pjson.oclif.update.s3.bucket
    basePrefix = pjson.oclif.update.s3.folder
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    await writeJSON(pjsonPath, pjson, {spaces: 2})
    await emptyDir(root)
  })
  afterEach(async () => {
    if (!process.env.PRESERVE_ARTIFACTS) {
      await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    }

    await writeJSON(pjsonPath, originalPJSON, {spaces: 2})
  })

  onlyMacos
    .command(['pack:macos'])
    .do(async () => {
      // install the intel silicon pkg
      ;[pkg, sha] = await findDistFileSha(cwd, 'macos', (f) => f.endsWith('x64.pkg'))
      await exec(`sudo installer -pkg ${path.join(cwd, 'dist', 'macos', pkg)} -target /`)
      expect(exec('oclif --version').stdout).to.contain(`oclif/${pjson.version}`)
      // tests binAlias
      expect(exec('oclif2 --version').stdout).to.contain(`oclif/${pjson.version}`)
    })
    .command(['upload:macos'])
    .it('publishes valid releases', async () => {
      await pipeline(
        got.stream(`https://${developerSalesforceCom}/${basePrefix}/versions/${pjson.version}/${sha}/${pkg}`),
        createWriteStream(pkg),
      )
    })
})
