import {expect, test} from '@oclif/test'
import {join} from 'path'
import * as fs from 'fs-extra'
import {promisify} from 'node:util'
import {pipeline as pipelineSync} from 'node:stream'
import got from 'got'
import {exec as execSync} from 'child_process'
import {hash} from '../../src/util'

const exec = promisify(execSync)

const pipeline = promisify(pipelineSync)
import aws from '../../src/aws'
import {
  developerSalesforceCom,
  gitShaSync,
  deleteFolder,
} from '../helpers/helper'
import {Interfaces} from '@oclif/core'

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version
const target = [process.platform, process.arch].join('-')
const skipIfWindows = process.platform === 'win32' ? test.skip() : test
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`
const cwd = process.cwd()
pjson.version = `${pjson.version}-${testRun}`
pjson.oclif.update.node.version = process.versions.node
const bucket = pjson.oclif.update.s3.bucket
const basePrefix = pjson.oclif.update.s3.folder
const root = join(__dirname, '../tmp/test/publish')
const sha = gitShaSync(cwd, {short: true})

const manifest = async (path: string, nodeVersion: string) => {
  const list = await aws.s3.listObjects({Bucket: bucket, Prefix: `${basePrefix}/${path}`})
  const manifestFile = list.Contents?.map(listObject => listObject.Key).find(f => f!.includes(target) && f!.endsWith('-buildmanifest'))
  if (!manifestFile) {
    throw new Error(`could not find a buildmanifest file for target ${target}`)
  }

  const manifest = await got(`https://${developerSalesforceCom}/${manifestFile}`).json<Interfaces.S3Manifest>()
  const test = async (url: string, expectedSha: string, nodeVersion: string) => {
    const xz = url.endsWith('.tar.xz')
    const ext = xz ? '.tar.xz' : '.tar.gz'
    await pipeline(
      got.stream(url),
      fs.createWriteStream(join(root, `oclif${ext}`)),
    )
    const receivedSha = await hash('sha256', join(root, `oclif${ext}`))
    expect(receivedSha).to.equal(expectedSha)
    if (xz) {
      await exec('tar xJf oclif.tar.xz', {cwd: root})
    } else {
      await exec('tar xzf oclif.tar.gz', {cwd: root})
    }

    const {stdout} = await exec('./oclif/bin/oclif --version', {cwd: root})
    expect(stdout).to.contain(`oclif/${pjson.version} ${target} node-v${nodeVersion}`)
    await fs.promises.rm(join(root, 'oclif'), {recursive: true})
  }

  await test(manifest.gz, manifest.sha256gz, nodeVersion)
  await test(manifest.xz!, manifest.sha256xz!, nodeVersion)
}

const folderCleanup = async () => Promise.all([
  deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`),
  deleteFolder(bucket, `${basePrefix}/channels/${pjson.version}/`),
])

describe('upload tarballs', async () => {
  beforeEach(async () => {
    await folderCleanup()
    await fs.writeJSON(pjsonPath, pjson, {spaces: 2})
    await fs.emptyDir(root)
  })
  afterEach(async () => {
    await folderCleanup()
    pjson.version = originalVersion
    await fs.writeJSON(pjsonPath, pjson, {spaces: 2})
  })

  skipIfWindows
  .command(['pack:tarballs', '--parallel', '--xz'])
  .command(['upload:tarballs', '--xz'])
  .command(['promote', '--channel', pjson.version, '--sha', sha, '--version', pjson.version])
  .it('checks uploads for version and channel', async () => {
    await manifest(`versions/${pjson.version}/${sha}`, pjson.oclif.update.node.version)
    await manifest(`channels/${pjson.version}`, pjson.oclif.update.node.version)
  })
})

