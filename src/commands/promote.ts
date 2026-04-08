import {MetadataDirective, ObjectCannedACL} from '@aws-sdk/client-s3'
import {Command, Flags, ux} from '@oclif/core'
import path from 'node:path'

import aws from '../aws'
import * as Tarballs from '../tarballs'
import {channelAWSDir, commitAWSDir, debArch, debVersion, s3Keys, templateShortKey} from '../upload-util'
import {uniq} from '../util'
import {appendToIndex} from '../version-indexes'

export default class Promote extends Command {
  static description = 'Promote CLI builds to a S3 release channel.'
  static flags = {
    channel: Flags.string({default: 'stable', description: 'Channel to promote to.', required: true}),
    deb: Flags.boolean({char: 'd', description: 'Promote debian artifacts.'}),
    'dry-run': Flags.boolean({
      description: 'Run the command without uploading to S3 or copying versioned tarballs/installers to channel.',
    }),
    'ignore-missing': Flags.boolean({
      description: 'Ignore missing tarballs/installers and continue promoting the rest.',
    }),
    indexes: Flags.boolean({description: 'Append the promoted urls into the index files.'}),
    macos: Flags.boolean({char: 'm', description: 'Promote macOS pkg.'}),
    'max-age': Flags.string({char: 'a', default: '86400', description: 'Cache control max-age in seconds.'}),
    root: Flags.string({char: 'r', default: '.', description: 'Path to the oclif CLI project root.', required: true}),
    sha: Flags.string({description: '7-digit short git commit SHA of the CLI to promote.', required: true}),
    targets: Flags.string({char: 't', description: 'Comma-separated targets to promote (e.g.: linux-arm,win32-x64).'}),
    version: Flags.string({description: 'Semantic version of the CLI to promote.', required: true}),
    win: Flags.boolean({char: 'w', description: 'Promote Windows exe.'}),
    xz: Flags.boolean({allowNo: true, description: 'Also upload xz.'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Promote)
    if (flags['ignore-missing']) {
      this.warn(
        "--ignore-missing flag is being used - This command will continue to run even if a promotion fails because it doesn't exist",
      )
    }

    this.log(`Promoting v${flags.version} (${flags.sha}) to ${flags.channel} channel\n`)

    const buildConfig = await Tarballs.buildConfig(flags.root, {targets: flags?.targets?.split(',')})
    const {config, s3Config} = buildConfig
    const keys = s3Keys(config, s3Config, {bin: config.bin, sha: flags.sha, version: flags.version})
    const indexDefaults = {
      maxAge: `max-age=${flags['max-age']}`,
      s3Config,
      version: flags.version,
    }

    if (!s3Config.bucket) this.error('Cannot determine S3 bucket for promotion')

    const awsDefaults = {
      ACL: s3Config.acl ?? ObjectCannedACL.public_read,
      Bucket: s3Config.bucket,
      CacheControl: indexDefaults.maxAge,
      MetadataDirective: MetadataDirective.REPLACE,
    }
    const cloudBucketCommitKey = (shortKey: string) =>
      path.posix.join(s3Config.bucket!, commitAWSDir(flags.version, flags.sha, s3Config), shortKey)
    const cloudChannelKey = (shortKey: string) => path.posix.join(channelAWSDir(flags.channel, s3Config), shortKey)

    // copy tarballs manifests
    const promoteManifest = async (target: (typeof buildConfig.targets)[number]) => {
      const sourceKey = keys.cloudKey(keys.manifest({arch: target.arch, platform: target.platform}))
      const destKey = keys.channelManifest({arch: target.arch, platform: target.platform}, flags.channel)
      await aws.s3.copyObject(
        {
          ...awsDefaults,
          CopySource: path.posix.join(s3Config.bucket!, sourceKey),
          Key: destKey,
        },
        {
          dryRun: flags['dry-run'],
          ignoreMissing: flags['ignore-missing'],
          namespace: path.basename(destKey),
        },
      )
    }

    const promoteGzTarballs = async (target: (typeof buildConfig.targets)[number]) => {
      const targetOpts = {arch: target.arch, platform: target.platform}
      const sourceKey = keys.cloudKey(keys.versioned('.tar.gz', targetOpts))
      const destKey = keys.channelTarball('.tar.gz', targetOpts, flags.channel)
      const copySource = path.posix.join(s3Config.bucket!, sourceKey)
      await Promise.all([
        aws.s3.copyObject(
          {
            ...awsDefaults,
            CopySource: copySource,
            Key: destKey,
          },
          {
            dryRun: flags['dry-run'],
            ignoreMissing: flags['ignore-missing'],
            namespace: keys.indexFilename('.tar.gz', targetOpts, flags.channel),
          },
        ),
        ...(flags.indexes
          ? [
              appendToIndex({
                ...indexDefaults,
                dryRun: flags['dry-run'],
                filename: keys.indexFilename('.tar.gz', targetOpts, flags.channel),
                originalUrl: copySource,
              }),
            ]
          : []),
      ])
    }

    const promoteXzTarballs = async (target: (typeof buildConfig.targets)[number]) => {
      const targetOpts = {arch: target.arch, platform: target.platform}
      const sourceKey = keys.cloudKey(keys.versioned('.tar.xz', targetOpts))
      const destKey = keys.channelTarball('.tar.xz', targetOpts, flags.channel)
      const copySource = path.posix.join(s3Config.bucket!, sourceKey)
      await Promise.all([
        aws.s3.copyObject(
          {
            ...awsDefaults,
            CopySource: copySource,
            Key: destKey,
          },
          {
            dryRun: flags['dry-run'],
            ignoreMissing: flags['ignore-missing'],
            namespace: keys.indexFilename('.tar.xz', targetOpts, flags.channel),
          },
        ),
        ...(flags.indexes
          ? [
              appendToIndex({
                ...indexDefaults,
                dryRun: flags['dry-run'],
                filename: keys.indexFilename('.tar.xz', targetOpts, flags.channel),
                originalUrl: copySource,
              }),
            ]
          : []),
      ])
    }

    const promoteMacInstallers = async () => {
      const arches = uniq(buildConfig.targets.filter((t) => t.platform === 'darwin').map((t) => t.arch))
      await Promise.all(
        arches.map(async (arch) => {
          const darwinPkg = templateShortKey('macos', {arch, bin: config.bin, sha: flags.sha, version: flags.version})
          const darwinCopySource = cloudBucketCommitKey(darwinPkg)
          // strip version & sha so scripts can point to a static channel pkg
          const unversionedPkg = darwinPkg.replace(`-v${flags.version}-${flags.sha}`, '')
          await Promise.all([
            aws.s3.copyObject(
              {
                ...awsDefaults,
                CopySource: darwinCopySource,
                Key: cloudChannelKey(unversionedPkg),
              },
              {
                dryRun: flags['dry-run'],
                ignoreMissing: flags['ignore-missing'],
                namespace: unversionedPkg,
              },
            ),
            ...(flags.indexes
              ? [
                  appendToIndex({
                    ...indexDefaults,
                    dryRun: flags['dry-run'],
                    filename: unversionedPkg,
                    originalUrl: darwinCopySource,
                  }),
                ]
              : []),
          ])
        }),
      )
    }

    const promoteWindowsInstallers = async () => {
      // copy win exe
      const arches = buildConfig.targets.filter((t) => t.platform === 'win32').map((t) => t.arch)
      await Promise.all(
        arches.map(async (arch) => {
          const winPkg = templateShortKey('win32', {arch, bin: config.bin, sha: flags.sha, version: flags.version})
          const winCopySource = cloudBucketCommitKey(winPkg)
          // strip version & sha so scripts can point to a static channel exe
          const unversionedExe = winPkg.replace(`-v${flags.version}-${flags.sha}`, '')
          await Promise.all([
            aws.s3.copyObject(
              {
                ...awsDefaults,
                CopySource: winCopySource,
                Key: cloudChannelKey(unversionedExe),
              },
              {
                dryRun: flags['dry-run'],
                ignoreMissing: flags['ignore-missing'],
                namespace: unversionedExe,
              },
            ),
            ...(flags.indexes
              ? [
                  appendToIndex({
                    ...indexDefaults,
                    dryRun: flags['dry-run'],
                    filename: unversionedExe,
                    originalUrl: winCopySource,
                  }),
                ]
              : []),
          ])
          ux.action.stop('successfully')
        }),
      )
    }

    const promoteDebianAptPackages = async () => {
      const arches = buildConfig.targets.filter((t) => t.platform === 'linux')

      // copy debian artifacts
      const debArtifacts = [
        ...arches
          .filter((a) => !a.arch.includes('x86')) // See todo below
          .map((a) =>
            templateShortKey('deb', {
              arch: debArch(a.arch),
              bin: config.bin,
              versionShaRevision: debVersion(buildConfig),
            }),
          ),
        'Packages.gz',
        'Packages.xz',
        'Packages.bz2',
        'Release',
        'InRelease',
        'Release.gpg',
      ]

      await Promise.all(
        debArtifacts.flatMap((artifact) => {
          const debCopySource = cloudBucketCommitKey(`apt/${artifact}`)
          const debKey = cloudChannelKey(`apt/${artifact}`)
          // apt expects ../apt/dists/versionName/[artifacts] but oclif wants versions/sha/apt/[artifacts]
          // see https://github.com/oclif/oclif/issues/347 for the AWS-redirect that solves this
          // this workaround puts the code in both places that the redirect was doing
          // with this, the docs are correct. The copies are all done in parallel so it shouldn't be too costly.
          const workaroundKey = `${cloudChannelKey('apt/')}./${artifact}`
          return [
            aws.s3.copyObject(
              {
                ...awsDefaults,
                CopySource: debCopySource,
                Key: debKey,
              },
              {
                dryRun: flags['dry-run'],
                ignoreMissing: flags['ignore-missing'],
                namespace: debKey,
              },
            ),
            aws.s3.copyObject(
              {
                ...awsDefaults,
                CopySource: debCopySource,
                Key: workaroundKey,
              },
              {
                dryRun: flags['dry-run'],
                ignoreMissing: flags['ignore-missing'],
                namespace: workaroundKey,
              },
            ),
          ]
        }),
      )
    }

    await Promise.all([
      ...buildConfig.targets.flatMap((target) => [
        // always promote the manifest and gz
        promoteManifest(target),
        promoteGzTarballs(target),
      ]),
      ...(flags.xz ? buildConfig.targets.map((target) => promoteXzTarballs(target)) : []),
      ...(flags.macos ? [promoteMacInstallers()] : []),
      ...(flags.win ? [promoteWindowsInstallers()] : []),
      ...(flags.deb ? [promoteDebianAptPackages()] : []),
    ])
  }
}
