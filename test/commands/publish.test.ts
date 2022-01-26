import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'

import aws from '../../src/aws'
import {gitSha} from '../../src/tarballs'
import {
  devSalesforceoclifTestingVersionsURI,
  gitShaSync,
  oclifTestingChannelsURI,
  oclifTestingVersionsURI,
} from '../helpers/helper'

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../../package.json')
const originalVersion = pjson.version
const target = [process.platform, process.arch].join('-')

const skipIfWindows = process.platform === 'win32' ? test.skip() : test
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`
const s3UploadedFiles: string[] = []

describe('upload tarballs', async () => {
  const cwd = process.cwd()
  let sha: string
  beforeEach(async () => {
    sha = await gitSha(process.cwd(), {short: true})
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

  skipIfWindows
  .command(['pack:tarballs'])
  .do(async () => {
    sha = await gitSha(cwd, {short: true})
  })
  .command(['upload:tarballs'])
  .it('uploads valid releases', async () => {
    const manifest = async (path: string, nodeVersion: string) => {
      const listDirArgs = `s3 ls s3://${oclifTestingVersionsURI}/${path}/`
      const stdout = await qq.x.stdout('aws', listDirArgs.split(' '), {cwd: process.cwd()})
      const manifestFile = stdout?.split('\n').find(f => f.includes(target) && f.endsWith('-buildmanifest'))
      if (!manifestFile) {
        throw new Error(`could not find a buildmanifest file for target ${target}`)
      }

      const manifest = await qq.readJSON(`https://${devSalesforceoclifTestingVersionsURI}/${path}/${manifestFile.slice(manifestFile.lastIndexOf(' ') + 1)}`)
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

    await manifest(`${pjson.version}/${sha}`, pjson.oclif.update.node.version)
  })

  describe('promote to stable channel', () => {
    skipIfWindows
    .command(['promote', '--channel', 'stable', '-t', 'linux-x64', '--sha', gitShaSync(process.cwd(), {short: true}), '--version', pjson.version])
    .it('promote', async () => {
      const listDirArgs = `s3 ls s3://${oclifTestingChannelsURI}/stable/`
      const stdout = await qq.x.stdout('aws', listDirArgs.split(' '), {cwd: process.cwd()})
      expect(stdout).to.contain('linux-x64')
    })
  })

  describe.skip('with filter', () => {
    skipIfWindows
    .stub(aws, 's3', () => ({
      uploadFile: (file: string) => {
        s3UploadedFiles.push(file)
      },
    }))
    .command(['upload:tarballs', '-t', 'linux-x64'])
    .it('publishes only the specified target', async () => {
      expect(s3UploadedFiles.join(',')).to.contain('linux-x64')
      expect(s3UploadedFiles.join(',')).to.not.contain('win32-x64')
      expect(s3UploadedFiles.join(',')).to.not.contain('darwin-x64')
    })
  })

  describe.skip('without filter', () => {
    skipIfWindows
    .stub(aws, 's3', () => ({
      uploadFile: (file: string) => {
        s3UploadedFiles.push(file)
      },
    }))
    .command(['upload:tarballs'])
    .it('publishes all', async () => {
      expect(s3UploadedFiles.join(',')).to.contain('linux-x64')
      expect(s3UploadedFiles.join(',')).to.contain('win32-x64')
      expect(s3UploadedFiles.join(',')).to.contain('darwin-x64')
    })
  })
})
