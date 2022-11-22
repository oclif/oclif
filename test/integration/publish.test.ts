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
import {gitSha} from '../../src/tarballs'
import {
  developerSalesforceCom,
  // gitShaSync,
  deleteFolder,
} from '../helpers/helper'
import {Interfaces} from '@oclif/core'

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version
const target = [process.platform, process.arch].join('-')
const skipIfWindows = process.platform === 'win32' ? test.skip() : test
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`
// const s3UploadedFiles: string[] = []

describe('upload tarballs', async () => {
  const cwd = process.cwd()
  let sha: string
  let bucket: string
  let basePrefix: string
  const root = join(__dirname, '../tmp/test/publish')
  beforeEach(async () => {
    sha = await gitSha(process.cwd(), {short: true})
    pjson.version = `${pjson.version}-${testRun}`
    pjson.oclif.update.node.version = process.versions.node
    bucket = pjson.oclif.update.s3.bucket
    basePrefix = pjson.oclif.update.s3.folder
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    await fs.writeJSON(pjsonPath, pjson)
    await fs.emptyDir(root)
  })
  afterEach(async () => {
    await deleteFolder(bucket, `${basePrefix}/versions/${pjson.version}/`)
    pjson.version = originalVersion
    await fs.writeJSON(pjsonPath, pjson)
  })

  skipIfWindows
  .command(['pack:tarballs', '--parallel'])
  .do(async () => {
    sha = await gitSha(cwd, {short: true})
  })
  .command(['upload:tarballs'])
  // .command(['promote', '--channel', 'stable', '-t', 'darwin-x64', '--sha', gitShaSync(process.cwd(), {short: true}), '--version', pjson.version])
  .it('promotes valid releases', async () => {
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
          // await exec(`tar -C "${tmp}/node" -xJf "${tarball}"`)
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

    await manifest(`versions/${pjson.version}/${sha}`, pjson.oclif.update.node.version)
    // await testPromote('stable')
  })
})
