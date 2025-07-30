import {Interfaces} from '@oclif/core'
import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {emptyDir, writeJSON} from 'fs-extra'
import _ from 'lodash'
import {exec as execSync} from 'node:child_process'
import {createWriteStream} from 'node:fs'
import {rm} from 'node:fs/promises'
import {join} from 'node:path'
import {pipeline} from 'node:stream/promises'
import {promisify} from 'node:util'

import aws from '../../src/aws'
import {hash} from '../../src/util'
import {deleteFolder, developerSalesforceCom, gitShaSync} from '../helpers/helper'

const exec = promisify(execSync)

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
// eslint-disable-next-line unicorn/prefer-structured-clone
const originalPJSON = _.cloneDeep(pjson)
const target = [process.platform, process.arch].join('-')

const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`
const cwd = process.cwd()
pjson.version = `${pjson.version}-${testRun}`
pjson.oclif.update.node.version = process.versions.node
pjson.oclif.binAliases = ['oclif2']
const {bucket} = pjson.oclif.update.s3
const basePrefix = pjson.oclif.update.s3.folder
const root = join(__dirname, '../tmp/test/publish')
const sha = gitShaSync(cwd, {short: true})

const manifest = async (path: string, nodeVersion: string) => {
  const list = await aws.s3.listObjects({Bucket: bucket, Prefix: `${basePrefix}/${path}`})
  const manifestFile = list.Contents?.map((listObject) => listObject.Key).find(
    (f) => f!.includes(target) && f!.endsWith('-buildmanifest'),
  )
  if (!manifestFile) {
    throw new Error(`could not find a buildmanifest file for target ${target}`)
  }

  const {default: got} = await import('got')
  const manifest = await got(`https://${developerSalesforceCom}/${manifestFile}`).json<Interfaces.S3Manifest>()
  const runTest = async (url: string, expectedSha: string, nodeVersion: string) => {
    const xz = url.endsWith('.tar.xz')
    const ext = xz ? '.tar.xz' : '.tar.gz'
    await pipeline(got.stream(url), createWriteStream(join(root, `oclif${ext}`)))
    const receivedSha = await hash('sha256', join(root, `oclif${ext}`))
    expect(receivedSha).to.equal(expectedSha)
    await (xz ? exec('tar xJf oclif.tar.xz', {cwd: root}) : exec('tar xzf oclif.tar.gz', {cwd: root}))

    const {stdout} = await exec('./oclif/bin/oclif --version', {cwd: root})
    expect(stdout).to.contain(`oclif/${pjson.version} ${target} node-v${nodeVersion}`)

    // check alias
    const {stdout: oclif2} = await exec('./oclif/bin/oclif2 --version', {cwd: root})
    expect(oclif2).to.contain(`oclif/${pjson.version} ${target} node-v${nodeVersion}`)
    await rm(join(root, 'oclif'), {recursive: true})
  }

  await runTest(manifest.gz, manifest.sha256gz, nodeVersion)
  await runTest(manifest.xz!, manifest.sha256xz!, nodeVersion)
}

const folderCleanup = async () =>
  Promise.all([
    deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`),
    deleteFolder(bucket, `${basePrefix}/channels/${pjson.version}/`),
  ])

describe('upload tarballs', async () => {
  beforeEach(async () => {
    await folderCleanup()
    await writeJSON(pjsonPath, pjson, {spaces: 2})
    await emptyDir(root)
  })

  afterEach(async () => {
    if (!process.env.PRESERVE_ARTIFACTS) {
      await folderCleanup()
    }

    await writeJSON(pjsonPath, originalPJSON, {spaces: 2})
  })

  it('checks uploads for version and channel', async () => {
    await runCommand('pack tarballs --parallel --xz', undefined, {print: true})
    await runCommand('upload tarballs --xz', undefined, {print: true})
    await runCommand(`promote --channel ${pjson.version} --sha ${sha} --version ${pjson.version}`, undefined, {
      print: true,
    })
    await manifest(`versions/${pjson.version}/${sha}`, pjson.oclif.update.node.version)
    await manifest(`channels/${pjson.version}`, pjson.oclif.update.node.version)
  })
})
