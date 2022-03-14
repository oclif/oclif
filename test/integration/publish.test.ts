import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'

import aws from '../../src/aws'
import {gitSha} from '../../src/tarballs'
import {
  developerSalesforceCom,
  // gitShaSync,
  deleteFolder,
} from '../helpers/helper'

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
  beforeEach(async () => {
    sha = await gitSha(process.cwd(), {short: true})
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

  skipIfWindows
  .command(['pack:tarballs'])
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

      const manifest = await qq.readJSON(`https://${developerSalesforceCom}/${manifestFile}`)
      const test = async (url: string, expectedSha: string, nodeVersion: string) => {
        const xz = url.endsWith('.tar.xz')
        const ext = xz ? '.tar.xz' : '.tar.gz'
        await qq.download(url, `oclif${ext}`)
        const receivedSha = await qq.hash('sha256', `oclif${ext}`)
        expect(receivedSha).to.equal(expectedSha)
        if (xz) {
          await qq.x('tar xJf oclif.tar.xz')
        } else {
          await qq.x('tar xzf oclif.tar.gz')
        }

        const stdout = await qq.x.stdout('./oclif/bin/oclif', ['--version'])
        expect(stdout).to.contain(`oclif/${pjson.version} ${target} node-v${nodeVersion}`)
        await qq.rm('oclif')
      }

      await test(manifest.gz, manifest.sha256gz, nodeVersion)
      await test(manifest.xz, manifest.sha256xz, nodeVersion)
    }

    await manifest(`versions/${pjson.version}/${sha}`, pjson.oclif.update.node.version)
    // await testPromote('stable')
  })
})
