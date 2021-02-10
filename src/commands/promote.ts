import {Command, flags} from '@oclif/command'
import {cli} from 'cli-ux'
import * as path from 'path'

import aws from '../aws'
import * as Tarballs from '../tarballs'
import {templateShortKey, commitAWSDir, channelAWSDir, debVersion} from '../upload-util'

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
    'max-age': flags.string({char: 'a', description: 'cache control max-age in seconds', default: '86400'}),
  }

  async run() {
    const {flags} = this.parse(Promote)
    const maxAge = `max-age=${flags['max-age']}`
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
      this.log(`Promoting ${copySource} to ${flags.channel} at s3://${s3Config.bucket}/${key}`)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: copySource,
          Key: key,
          CacheControl: maxAge,
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
      this.log(`Promoting ${darwinCopySource} to ${flags.channel} at s3://${s3Config.bucket}/${darwinKey}`)
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: darwinCopySource,
          Key: darwinKey,
          CacheControl: maxAge,
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
        this.log(`Promoting ${winCopySource} to ${flags.channel} at s3://${s3Config.bucket}/${winKey}`)
        // eslint-disable-next-line no-await-in-loop
        await aws.s3.copyObject(
          {
            Bucket: s3Config.bucket,
            CopySource: winCopySource,
            Key: winKey,
            CacheControl: maxAge,
          },
        )
        cli.action.stop('successfully')
      }
    }

    // copy debian artifacts
    const debArtifacts = [
      templateShortKey('deb', {bin: config.bin, versionShaRevision: debVersion(buildConfig), arch: 'amd64' as any}),
      templateShortKey('deb', {bin: config.bin, versionShaRevision: debVersion(buildConfig), arch: 'i386' as any}),
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
        this.log(`Promoting ${debCopySource} to ${flags.channel} at s3://${s3Config.bucket}/${debKey}`)
        // eslint-disable-next-line no-await-in-loop
        await aws.s3.copyObject(
          {
            Bucket: s3Config.bucket,
            CopySource: debCopySource,
            Key: debKey,
            CacheControl: maxAge,
          },
        )
      }
    }
  }
}
