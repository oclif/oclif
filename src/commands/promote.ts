import * as path from 'path'

import * as _ from 'lodash'

import {CliUx, Command, Flags} from '@oclif/core'

import aws from '../aws'
import * as Tarballs from '../tarballs'
import {channelAWSDir, commitAWSDir, debVersion, templateShortKey} from '../upload-util'
import {appendToIndex} from '../version-indexes'

export default class Promote extends Command {
  static description = 'promote CLI builds to a S3 release channel'

  static flags = {
    root: Flags.string({char: 'r', description: 'path to the oclif CLI project root', default: '.', required: true}),
    version: Flags.string({description: 'semantic version of the CLI to promote', required: true}),
    sha: Flags.string({description: '7-digit short git commit SHA of the CLI to promote', required: true}),
    channel: Flags.string({description: 'which channel to promote to', required: true, default: 'stable'}),
    targets: Flags.string({char: 't', description: 'comma-separated targets to promote (e.g.: linux-arm,win32-x64)'}),
    deb: Flags.boolean({char: 'd', description: 'promote debian artifacts'}),
    macos: Flags.boolean({char: 'm', description: 'promote macOS pkg'}),
    win: Flags.boolean({char: 'w', description: 'promote Windows exe'}),
    'max-age': Flags.string({char: 'a', description: 'cache control max-age in seconds', default: '86400'}),
    xz: Flags.boolean({description: 'also upload xz', allowNo: true}),
    indexes: Flags.boolean({description: 'append the promoted urls into the index files'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Promote)
    const maxAge = `max-age=${flags['max-age']}`
    const buildConfig = await Tarballs.buildConfig(flags.root, {targets: flags?.targets?.split(',')})
    const {s3Config, config} = buildConfig
    const indexDefaults = {
      version: flags.version,
      s3Config,
      maxAge,
    }

    if (!s3Config.bucket) this.error('Cannot determine S3 bucket for promotion')

    const cloudBucketCommitKey = (shortKey: string) => path.join(s3Config.bucket!, commitAWSDir(flags.version, flags.sha, s3Config), shortKey)
    const cloudChannelKey = (shortKey: string) => path.join(channelAWSDir(flags.channel, s3Config), shortKey)

    // copy tarballs manifests
    if (buildConfig.targets.length > 0) this.log(`Promoting buildmanifests & unversioned tarballs to ${flags.channel}`)
    for (const target of buildConfig.targets) {
      const manifest = templateShortKey('manifest', {
        arch: target.arch,
        bin: config.bin,
        platform: target.platform,
        sha: flags.sha,
        version: flags.version,
      })
      const copySource = cloudBucketCommitKey(manifest)
      // strip version & sha so update/scripts can point to a static channel manifest
      const unversionedManifest = manifest.replace(`-v${flags.version}-${flags.sha}`, '')
      const key = cloudChannelKey(unversionedManifest)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: copySource,
          Key: key,
          CacheControl: maxAge,
          MetadataDirective: 'REPLACE',
        },
      )
      const versionedTarGzName = templateShortKey('versioned', '.tar.gz', {
        arch: target.arch,
        bin: config.bin,
        platform: target.platform,
        sha: flags.sha,
        version: flags.version,
      })
      const versionedTarGzKey = cloudBucketCommitKey(versionedTarGzName)
      // strip version & sha so update/scripts can point to a static channel tarball
      const unversionedTarGzName = versionedTarGzName.replace(`-v${flags.version}-${flags.sha}`, '')
      const unversionedTarGzKey = cloudChannelKey(unversionedTarGzName)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: versionedTarGzKey,
          Key: unversionedTarGzKey,
          CacheControl: maxAge,
          MetadataDirective: 'REPLACE',
        },
      )

      // eslint-disable-next-line no-await-in-loop
      if (flags.indexes) await appendToIndex({...indexDefaults, originalUrl: versionedTarGzKey, filename: unversionedTarGzName})

      if (flags.xz) {
        const versionedTarXzName = templateShortKey('versioned', '.tar.xz', {
          arch: target.arch,
          bin: config.bin,
          platform: target.platform,
          sha: flags.sha,
          version: flags.version,
        })
        const versionedTarXzKey = cloudBucketCommitKey(versionedTarXzName)
        // strip version & sha so update/scripts can point to a static channel tarball
        const unversionedTarXzName = versionedTarXzName.replace(`-v${flags.version}-${flags.sha}`, '')
        const unversionedTarXzKey = cloudChannelKey(unversionedTarXzName)
        // eslint-disable-next-line no-await-in-loop
        await aws.s3.copyObject(
          {
            Bucket: s3Config.bucket,
            CopySource: versionedTarXzKey,
            Key: unversionedTarXzKey,
            CacheControl: maxAge,
            MetadataDirective: 'REPLACE',
          },
        )
        // eslint-disable-next-line no-await-in-loop
        if (flags.indexes) await appendToIndex({...indexDefaults, originalUrl: versionedTarXzKey, filename: unversionedTarXzName})
      }
    }

    // copy darwin pkg
    if (flags.macos) {
      this.log(`Promoting macos pkgs to ${flags.channel}`)
      const arches = _.uniq(buildConfig.targets.filter(t => t.platform === 'darwin').map(t => t.arch))
      for (const arch of arches) {
        const darwinPkg = templateShortKey('macos', {bin: config.bin, version: flags.version, sha: flags.sha, arch})
        const darwinCopySource = cloudBucketCommitKey(darwinPkg)
        // strip version & sha so scripts can point to a static channel pkg
        const unversionedPkg = darwinPkg.replace(`-v${flags.version}-${flags.sha}`, '')
        const darwinKey = cloudChannelKey(unversionedPkg)
        // eslint-disable-next-line no-await-in-loop
        await aws.s3.copyObject(
          {
            Bucket: s3Config.bucket,
            CopySource: darwinCopySource,
            Key: darwinKey,
            CacheControl: maxAge,
            MetadataDirective: 'REPLACE',
          },
        )
        // eslint-disable-next-line no-await-in-loop
        if (flags.indexes) await appendToIndex({...indexDefaults, originalUrl: darwinCopySource, filename: unversionedPkg})
      }
    }

    // copy win exe
    if (flags.win) {
      this.log(`Promoting windows exe to ${flags.channel}`)
      const archs = buildConfig.targets.filter(t => t.platform === 'win32').map(t => t.arch)
      for (const arch  of archs) {
        const winPkg = templateShortKey('win32', {bin: config.bin, version: flags.version, sha: flags.sha, arch})
        const winCopySource = cloudBucketCommitKey(winPkg)
        // strip version & sha so scripts can point to a static channel exe
        const unversionedExe = winPkg.replace(`-v${flags.version}-${flags.sha}`, '')
        const winKey = cloudChannelKey(unversionedExe)
        // eslint-disable-next-line no-await-in-loop
        await aws.s3.copyObject(
          {
            Bucket: s3Config.bucket,
            CopySource: winCopySource,
            Key: winKey,
            CacheControl: maxAge,
          },
        )
        // eslint-disable-next-line no-await-in-loop
        if (flags.indexes) await appendToIndex({...indexDefaults, originalUrl: winCopySource, filename: unversionedExe})
        CliUx.ux.action.stop('successfully')
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
      this.log(`Promoting debian artifacts to ${flags.channel}`)
      for (const artifact of debArtifacts) {
        const debCopySource = cloudBucketCommitKey(`apt/${artifact}`)
        const debKey = cloudChannelKey(`apt/${artifact}`)
        // eslint-disable-next-line no-await-in-loop
        await aws.s3.copyObject(
          {
            Bucket: s3Config.bucket,
            CopySource: debCopySource,
            Key: debKey,
            CacheControl: maxAge,
            MetadataDirective: 'REPLACE',
          },
        )
      }
    }
  }
}
