import {Command, flags} from '@oclif/command'
import {ArchTypes, PlatformTypes} from '@oclif/config'
import * as qq from 'qqjs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, commitSHA, s3Key} from '../../upload-util'

export default class Upload extends Command {
  static hidden = true

  static description = `upload an oclif CLI to S3

"aws-sdk" will need to be installed as a devDependency to upload.
`

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    targets: flags.enum({char: 't', description: 'comma-separated targets to promote (e.g.: linux-arm,win32-x64)', options: Tarballs.TARGETS, default: Tarballs.TARGETS}),
  }

  async run() {
    const {flags} = this.parse(Upload)
    if (process.platform === 'win32') throw new Error('upload does not function on windows')
    const buildConfig = await Tarballs.buildConfig(flags.root, {targets: flags.targets})
    const {s3Config, targets, dist, version, config, xz} = buildConfig

    for (const target of targets) {
      const tarball = dist(s3Key('unversioned', {ext: '.tar.gz', bin: config.bin, ...target}))
      // eslint-disable-next-line no-await-in-loop
      if (!await qq.exists(tarball)) this.error(`Cannot find a tarball for ${target.platform}-${target.arch}`, {
        suggestions: [`Run "oclif-dev pack --target ${target.platform}-${target.arch}" before uploading`],
      })
    }

    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    const uploadTarball = async (options?: {platform: PlatformTypes; arch: ArchTypes}) => {
      const TarballS3Options = {...S3Options, CacheControl: 'max-age=604800'}
      const releaseTarballs = async (ext: '.tar.gz' | '.tar.xz') => {
        const localKey = s3Key('unversioned', ext, {
          arch: options?.arch!,
          bin: config.bin,
          platform: options?.platform!,
          root: config.root,
        })
        const cloudKey = `${commitAWSDir(version, config.root)}/${localKey}`
        await aws.s3.uploadFile(dist(localKey), {...TarballS3Options, ContentType: 'application/gzip', Key: cloudKey})
      }

      await releaseTarballs('.tar.gz')
      if (xz) await releaseTarballs('.tar.xz')

      const ManifestS3Options = {...S3Options, CacheControl: 'max-age=86400', ContentType: 'application/json'}
      const manifest = s3Key('manifest', options)
      const cloudKey = `${commitAWSDir(version, config.root)}/${manifest}`
      await aws.s3.uploadFile(dist(manifest), {...ManifestS3Options, Key: cloudKey})
    }
    if (targets.length > 0) log('uploading targets')
    // eslint-disable-next-line no-await-in-loop
    for (const target of targets) await uploadTarball(target)
    log(`uploaded ${version}, git SHA ${commitSHA(this.config.root)} targets`)
  }
}
