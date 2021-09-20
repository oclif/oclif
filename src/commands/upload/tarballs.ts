import {Command, Flags} from '@oclif/core'
import {Interfaces} from '@oclif/core'
import * as qq from 'qqjs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, templateShortKey} from '../../upload-util'

export default class UploadTarballs extends Command {
  static description = `upload an oclif CLI to S3

"aws-sdk" will need to be installed as a devDependency to upload.
`

  static flags = {
    root: Flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    targets: Flags.string({
      char: 't',
      description: 'comma-separated targets to upload (e.g.: linux-arm,win32-x64)',
      default: Tarballs.TARGETS.join(','),
    }),
    xz: Flags.boolean({description: 'also upload xz', allowNo: true, default: true}),
  }

  async run() {
    const {flags} = await this.parse(UploadTarballs)
    if (process.platform === 'win32') throw new Error('upload does not function on windows')
    const targets = flags.targets.split(',')
    const buildConfig = await Tarballs.buildConfig(flags.root, {targets, xz: flags.xz})
    const {s3Config, dist, version, config, xz} = buildConfig

    // fail early if targets are not built
    for (const target of buildConfig.targets) {
      const tarball = dist(templateShortKey('versioned', {ext: '.tar.gz', bin: config.bin, version, sha: buildConfig.gitSha, ...target}))
      // eslint-disable-next-line no-await-in-loop
      if (!await qq.exists(tarball)) this.error(`Cannot find a tarball for ${target.platform}-${target.arch}`, {
        suggestions: [`Run "oclif-dev pack --target ${target.platform}-${target.arch}" before uploading`],
      })
    }

    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    const uploadTarball = async (options?: { platform: Interfaces.PlatformTypes; arch: Interfaces.ArchTypes}) => {
      const TarballS3Options = {...S3Options, CacheControl: 'max-age=604800'}
      const releaseTarballs = async (ext: '.tar.gz' | '.tar.xz') => {
        const localKey = templateShortKey('versioned', ext, {
          arch: options?.arch!,
          bin: config.bin,
          platform: options?.platform!,
          sha: buildConfig.gitSha,
          version,
        })
        const cloudKey = `${commitAWSDir(version, buildConfig.gitSha, s3Config)}/${localKey}`
        await aws.s3.uploadFile(dist(localKey), {...TarballS3Options, ContentType: 'application/gzip', Key: cloudKey})
      }

      await releaseTarballs('.tar.gz')
      if (xz) await releaseTarballs('.tar.xz')

      const ManifestS3Options = {...S3Options, CacheControl: 'max-age=86400', ContentType: 'application/json'}
      const manifest = templateShortKey('manifest', {
        arch: options?.arch!,
        bin: config.bin,
        platform: options?.platform!,
        sha: buildConfig.gitSha,
        version: config.version,
      })
      const cloudKey = `${commitAWSDir(version, buildConfig.gitSha, s3Config)}/${manifest}`
      await aws.s3.uploadFile(dist(manifest), {...ManifestS3Options, Key: cloudKey})
    }

    if (targets.length > 0) log('uploading targets')
    // eslint-disable-next-line no-await-in-loop
    for (const target of buildConfig.targets) await uploadTarball(target)
    log(`done uploading tarballs & manifests for v${config.version}-${buildConfig.gitSha}`)
  }
}
