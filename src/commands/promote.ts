import {Command, flags} from '@oclif/command'
import {cli} from 'cli-ux'
import * as path from 'path'

import aws from '../aws'
import * as Tarballs from '../tarballs'
import {log} from '../log'
import {templateShortKey, commitAWSDir, channelAWSDir} from '../upload-util'

export default class Promote extends Command {
  static hidden = true

  static description = 'promote CLI builds to a S3 release channel'

  static flags = {
    root: flags.string({char: 'r', description: 'path to the oclif CLI project root', default: '.', required: true}),
    version: flags.string({description: 'semantic version of the CLI to promote', required: true}),
    sha: flags.string({description: '7-digit short git commit SHA of the CLI to promote', required: true}),
    channel: flags.string({description: 'which channel to promote to', required: true, default: 'stable'}),
    targets: flags.string({
      char: 't',
      description: 'comma-separated targets to promote (e.g.: linux-arm,win32-x64)',
      default: Tarballs.TARGETS.join(','),
    }),
    deb: flags.boolean({char: 'd', description: 'promote debian artifacts'}),
    macos: flags.boolean({char: 'm', description: 'promote MacOS pkg'}),
    win: flags.boolean({char: 'w', description: 'promote Windows exe'}),
  }

  async run() {
    const {flags} = this.parse(Promote)
    const targets = flags.targets.split(',')
    const buildConfig = await Tarballs.buildConfig(flags.root, {targets})
    const {s3Config, config} = buildConfig

    if (!s3Config.bucket) this.error('Cannot determine S3 bucket for promotion')

    const cloudBucketCommitKey = (shortKey: string) => path.join(s3Config.bucket!, commitAWSDir(flags.version, flags.sha, s3Config), shortKey)
    const cloudChannelKey = (shortKey: string) => path.join(channelAWSDir(flags.channel, s3Config), shortKey)

    // copy tarballs manifests
    for (const target of buildConfig.targets) {
      const manifest = templateShortKey('manifest', {
        arch: target.arch,
        bin: config.bin,
        platform: target.platform,
        sha: buildConfig.gitSha,
        version: config.version,
      })
      const copySource = cloudBucketCommitKey(manifest)
      // strip version & sha so update/scripts can point to a static channel manifest
      const unversionedManifest = manifest.replace(`-v${flags.version}-${flags.sha}`, '')
      const key = cloudChannelKey(unversionedManifest)
      log(`Promoting ${manifest} to ${flags.channel} in s3://${s3Config.bucket}`)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: copySource,
          Key: key,
        },
      )
    }

    // copy darwin pkg
    if (flags.macos) {
      const darwinPkg = templateShortKey('macos', {bin: config.bin, version: flags.version, sha: flags.sha})
      const darwinCopySource = cloudBucketCommitKey(darwinPkg)
      // strip version & sha so scripts can point to a static channel pkg
      const unversionedPkg = darwinPkg.replace(`-v${flags.version}-${flags.sha}`, '')
      const darwinKey = cloudChannelKey(unversionedPkg)
      log(`Promoting ${darwinPkg} to ${flags.channel} in s3://${s3Config.bucket}`)
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: darwinCopySource,
          Key: darwinKey,
        },
      )
    }

    // copy win exe
    if (flags.win) {
      const archs = buildConfig.targets.filter(t => t.platform === 'win32').map(t => t.arch)
      for (const arch  of archs) {
        const winPkg = templateShortKey('win32', {bin: config.bin, version: flags.version, sha: flags.sha, arch})
        const winCopySource = cloudBucketCommitKey(winPkg)
        // strip version & sha so scripts can point to a static channel exe
        const unversionedExe = winPkg.replace(`-v${flags.version}-${flags.sha}`, '')
        const winKey = cloudChannelKey(unversionedExe)
        log(`Promoting ${winPkg} to ${flags.channel} in s3://${s3Config.bucket}`)
        // eslint-disable-next-line no-await-in-loop
        await aws.s3.copyObject(
          {
            Bucket: s3Config.bucket,
            CopySource: winCopySource,
            Key: winKey,
          },
        )
        cli.action.stop('successfully')
      }
    }

    // copy debian artifacts
    const debVersion = `${config.version}-1`
    // ^^ see debian_revision: https://www.debian.org/doc/debian-policy/ch-controlfields.html
    const debArtifacts = [
      templateShortKey('deb', {bin: config.bin, version: debVersion, arch: 'amd64' as any}),
      templateShortKey('deb', {bin: config.bin, version: debVersion, arch: 'i386' as any}),
      'Packages.gz',
      'Packages.xz',
      'Packages.bz2',
      'Release',
      'InRelease',
      'Release.gpg',
    ]
    if (flags.deb) {
      for (const artifact of debArtifacts) {
        const debCopySource = cloudBucketCommitKey(`apt/${artifact}`)
        const debKey = cloudChannelKey(`apt/${artifact}`)
        log(`Promoting apt/${artifact} to ${flags.channel} in s3://${s3Config.bucket}`)
        // eslint-disable-next-line no-await-in-loop
        await aws.s3.copyObject(
          {
            Bucket: s3Config.bucket,
            CopySource: debCopySource,
            Key: debKey,
          },
        )
      }
    }
  }
}
