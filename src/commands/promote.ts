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
    const buildConfig = await Tarballs.buildConfig(flags.root, {targets: flags?.targets?.split(',')})
    const {s3Config, config} = buildConfig
    const indexDefaults = {
      version: flags.version,
      s3Config,
      maxAge: `max-age=${flags['max-age']}`,
    }

    if (!s3Config.bucket) this.error('Cannot determine S3 bucket for promotion')
    const awsDefaults = {
      Bucket: s3Config.bucket,
      ACL: s3Config.acl ?? 'public-read',
      MetadataDirective: 'REPLACE',
      CacheControl: indexDefaults.maxAge,
    }
    const cloudBucketCommitKey = (shortKey: string) => path.join(s3Config.bucket!, commitAWSDir(flags.version, flags.sha, s3Config), shortKey)
    const cloudChannelKey = (shortKey: string) => path.join(channelAWSDir(flags.channel, s3Config), shortKey)

    // copy tarballs manifests
    if (buildConfig.targets.length > 0) this.log(`Promoting buildmanifests & unversioned tarballs to ${flags.channel}`)

    const promoteManifest = async (target: typeof buildConfig.targets[number]) => {
      const manifest = templateShortKey('manifest', {
        arch: target.arch,
        bin: config.bin,
        platform: target.platform,
        sha: flags.sha,
        version: flags.version,
      })
      // strip version & sha so update/scripts can point to a static channel manifest
      const unversionedManifest = manifest.replace(`-v${flags.version}-${flags.sha}`, '')
      await aws.s3.copyObject(
        {
          ...awsDefaults,
          CopySource: cloudBucketCommitKey(manifest),
          Key: cloudChannelKey(unversionedManifest),
        },
      )
    }

    const promoteGzTarballs = async (target: typeof buildConfig.targets[number]) => {
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
      await Promise.all([aws.s3.copyObject(
        {
          ...awsDefaults,
          CopySource: versionedTarGzKey,
          Key: unversionedTarGzKey,
        },
      )].concat(flags.indexes ? [appendToIndex({...indexDefaults, originalUrl: versionedTarGzKey, filename: unversionedTarGzName})] : []))
    }

    const promoteXzTarballs = async (target: typeof buildConfig.targets[number]) => {
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
      await Promise.all([aws.s3.copyObject(
        {
          ...awsDefaults,
          CopySource: versionedTarXzKey,
          Key: unversionedTarXzKey,
        },
      )].concat(flags.indexes ? [appendToIndex({...indexDefaults, originalUrl: versionedTarXzKey, filename: unversionedTarXzName})] : []))
    }

    const promoteMacInstallers = async () => {
      this.log(`Promoting macos pkgs to ${flags.channel}`)
      const arches = _.uniq(buildConfig.targets.filter(t => t.platform === 'darwin').map(t => t.arch))
      await Promise.all(arches.map(async arch => {
        const darwinPkg = templateShortKey('macos', {bin: config.bin, version: flags.version, sha: flags.sha, arch})
        const darwinCopySource = cloudBucketCommitKey(darwinPkg)
        // strip version & sha so scripts can point to a static channel pkg
        const unversionedPkg = darwinPkg.replace(`-v${flags.version}-${flags.sha}`, '')
        await Promise.all([aws.s3.copyObject(
          {
            ...awsDefaults,
            CopySource: darwinCopySource,
            Key: cloudChannelKey(unversionedPkg),

          },
        )].concat(flags.indexes ? [appendToIndex({...indexDefaults, originalUrl: darwinCopySource, filename: unversionedPkg})] : []))
      }))
    }

    const promoteWindowsInstallers = async () => {
      // copy win exe
      this.log(`Promoting windows exe to ${flags.channel}`)
      const arches = buildConfig.targets.filter(t => t.platform === 'win32').map(t => t.arch)
      await Promise.all(arches.map(async arch => {
        const winPkg = templateShortKey('win32', {bin: config.bin, version: flags.version, sha: flags.sha, arch})
        const winCopySource = cloudBucketCommitKey(winPkg)
        // strip version & sha so scripts can point to a static channel exe
        const unversionedExe = winPkg.replace(`-v${flags.version}-${flags.sha}`, '')
        await Promise.all([aws.s3.copyObject(
          {
            ...awsDefaults,
            CopySource: winCopySource,
            Key: cloudChannelKey(unversionedExe),
          },
        )].concat(flags.indexes ? [appendToIndex({...indexDefaults, originalUrl: winCopySource, filename: unversionedExe})] : []))
        CliUx.ux.action.stop('successfully')
      }))
    }

    const promoteDebianAptPackages = async () => {
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
      this.log(`Promoting debian artifacts to ${flags.channel}`)
      await Promise.all(debArtifacts.flatMap(artifact => {
        const debCopySource = cloudBucketCommitKey(`apt/${artifact}`)
        const debKey = cloudChannelKey(`apt/${artifact}`)
        // apt expects ../apt/dists/versionName/[artifacts] but oclif wants varsions/sha/apt/[artifacts]
        // see https://github.com/oclif/oclif/issues/347 for the AWS-redirect that solves this
        // this workaround puts the code in both places that the redirect was doing
        // with this, the docs are correct. The copies are all done in parallel so it shouldn't be too costly.
        const workaroundKey = cloudChannelKey(`apt/./${artifact}`)
        return [
          aws.s3.copyObject(
            {
              ...awsDefaults,
              CopySource: debCopySource,
              Key: debKey,
            },
          ),
          aws.s3.copyObject(
            {
              ...awsDefaults,
              CopySource: debCopySource,
              Key: workaroundKey,
            },
          ),
        ]
      }),

      )
    }

    await Promise.all(buildConfig.targets.flatMap(target => [
      // always promote the manifest and gz
      promoteManifest(target),
      promoteGzTarballs(target),
    ])
    // optionally promote other artifacts depending on the specified flags
    .concat(flags.xz ? buildConfig.targets.map(target => promoteXzTarballs(target)) : [])
    .concat(flags.macos ? [promoteMacInstallers()] : [])
    .concat(flags.win ? [promoteWindowsInstallers()] : [])
    .concat(flags.deb ? [promoteDebianAptPackages()] : []),
    )
  }
}
