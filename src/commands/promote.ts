import {Command, flags} from '@oclif/command'
import {cli} from 'cli-ux'
import * as fs from 'fs-extra'
import * as path from 'path'

import aws from '../aws'
import * as Tarballs from '../tarballs'
import {templateShortKey, commitAWSDir, channelAWSDir, debVersion} from '../upload-util'
import {sortVersionsObjectByKeysDesc} from '../util'

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
    macos: flags.boolean({char: 'm', description: 'promote macOS pkg'}),
    win: flags.boolean({char: 'w', description: 'promote Windows exe'}),
    'max-age': flags.string({char: 'a', description: 'cache control max-age in seconds', default: '86400'}),
    xz: flags.boolean({description: 'also upload xz', allowNo: true, default: true}),
    indexes: flags.boolean({description: 'append the promoted urls into the index files'}),
  }

  async run() {
    const {flags} = this.parse(Promote)
    const maxAge = `max-age=${flags['max-age']}`
    const targets = flags.targets.split(',')
    const buildConfig = await Tarballs.buildConfig(flags.root, {targets})
    const {s3Config, config} = buildConfig

    const appendToIndex = async (input: { originalUrl: string; filename: string }) => {
      // these checks are both nice for users AND helpful for TS
      if (!s3Config.bucket) throw new Error('[package.json].oclif.s3.bucket is required for indexes')
      if (!s3Config.host) throw new Error('[package.json].oclif.s3.host is required for indexes')

      // json-friendly filenames like sfdx-linux-x64-tar-gz
      const jsonFileName = `${input.filename.replace(/\./g, '-')}.json`
      const key = path.join(s3Config.folder!, 'versions', jsonFileName)

      // retrieve existing index file
      let existing = {}
      try {
        existing = JSON.parse((await aws.s3.getObject({
          Bucket: s3Config.bucket,
          Key: key,
        })).Body?.toString() as string)
        this.log('appending to existing index file')
      } catch (error) {
        this.error(`error on ${key}`, error)
      }
      // appends new version from this promotion if not already present (idempotent)
      await fs.writeJSON(jsonFileName, sortVersionsObjectByKeysDesc({...existing, [flags.version]: input.originalUrl.replace(s3Config.bucket, s3Config.host)}), {spaces: 2})

      // put the file back in the same place
      await aws.s3.uploadFile(jsonFileName, {
        Bucket: s3Config.bucket,
        Key: key,
        CacheControl: maxAge,
      })
      // cleans up local fs
      await fs.remove(jsonFileName)
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
      if (flags.indexes) await appendToIndex({originalUrl: versionedTarGzKey, filename: unversionedTarGzName})

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
        if (flags.indexes) await appendToIndex({originalUrl: versionedTarXzKey, filename: unversionedTarXzName})
      }
    }

    // copy darwin pkg
    if (flags.macos) {
      this.log(`Promoting macos pkg to ${flags.channel}`)
      const darwinPkg = templateShortKey('macos', {bin: config.bin, version: flags.version, sha: flags.sha})
      const darwinCopySource = cloudBucketCommitKey(darwinPkg)
      // strip version & sha so scripts can point to a static channel pkg
      const unversionedPkg = darwinPkg.replace(`-v${flags.version}-${flags.sha}`, '')
      const darwinKey = cloudChannelKey(unversionedPkg)
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: darwinCopySource,
          Key: darwinKey,
          CacheControl: maxAge,
          MetadataDirective: 'REPLACE',
        },
      )
      if (flags.indexes) await appendToIndex({originalUrl: darwinCopySource, filename: unversionedPkg})
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
        if (flags.indexes) await appendToIndex({originalUrl: winCopySource, filename: unversionedExe})
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
