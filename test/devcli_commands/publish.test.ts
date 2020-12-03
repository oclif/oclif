import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'

import aws from '../../src/aws'
import {gitSha} from '../../src/tarballs'

const pjson = require('../../package.json')
const pjsonPath = require.resolve('../package.json')
const originalVersion = pjson.version
const target = [process.platform, process.arch].join('-')

const skipIfWindows = process.platform === 'win32' ? test.skip() : test
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`
const s3UploadedFiles: string[] = []

describe('publish', () => {
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

  skipIfWindows
  .command(['pack'])
  .command(['publish'])
  .it('publishes valid releases', async () => {
    const manifest = async (url: string, nodeVersion: string) => {
      const manifest = await qq.readJSON(url)
      const test = async (url: string, expectedSha: string, nodeVersion: string) => {
        const xz = url.endsWith('.tar.xz')
        const ext = xz ? '.tar.xz' : '.tar.gz'
        await qq.download(url, `oclif-dev${ext}`)
        const receivedSha = await qq.hash('sha256', `oclif-dev${ext}`)
        expect(receivedSha).to.equal(expectedSha)
        if (xz) {
          await qq.x('tar xJf oclif-dev.tar.xz')
        } else {
          await qq.x('tar xzf oclif-dev.tar.gz')
        }
        const stdout = await qq.x.stdout('./oclif-dev/bin/oclif-dev', ['--version'])
        const sha = await gitSha(process.cwd(), {short: true})
        expect(stdout).to.contain(`@oclif/dev-cli/${pjson.version}.${sha} ${target} node-v${nodeVersion}`)
        await qq.rm('oclif-dev')
      }

      await test(manifest.gz, manifest.sha256gz, nodeVersion)
      await test(manifest.xz, manifest.sha256xz, nodeVersion)
    }
    await manifest(`https://oclif-staging.s3.amazonaws.com/channels/${testRun}/version`, process.versions.node)
    await manifest(`https://oclif-staging.s3.amazonaws.com/channels/${testRun}/${target}`, pjson.oclif.update.node.version)
  })

  describe('with filter', () => {
    skipIfWindows
    .stub(aws, 's3', () => ({
      uploadFile: (file: string) => {
        s3UploadedFiles.push(file)
      },
    }))
    .command(['publish', '-t', 'linux-x64'])
    .it('publishes only the specified target', async () => {
      expect(s3UploadedFiles.join()).to.contain('linux-x64')
      expect(s3UploadedFiles.join()).to.not.contain('win32-x64')
      expect(s3UploadedFiles.join()).to.not.contain('darwin-x64')
    })
  })

  describe('without filter', () => {
    skipIfWindows
    .stub(aws, 's3', () => ({
      uploadFile: (file: string) => {
        s3UploadedFiles.push(file)
      },
    }))
    .command(['publish'])
    .it('publishes all', async () => {
      expect(s3UploadedFiles.join()).to.contain('linux-x64')
      expect(s3UploadedFiles.join()).to.contain('win32-x64')
      expect(s3UploadedFiles.join()).to.contain('darwin-x64')
    })
  })
})
