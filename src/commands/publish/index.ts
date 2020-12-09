import {Command, flags} from '@oclif/command'
import {ArchTypes, PlatformTypes} from '@oclif/config'
import * as qq from 'qqjs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'

export default class Publish extends Command {
  static hidden = true

  static description = `publish an oclif CLI to S3

"aws-sdk" will need to be installed as a devDependency to publish.
`

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    targets: flags.string({char: 't', description: 'comma-separated targets to pack (e.g.: linux-arm,win32-x64)'}),
  }

  buildConfig!: Tarballs.IConfig

  async run() {
    const {flags} = this.parse(Publish)
    if (process.platform === 'win32') throw new Error('publish does not function on windows')
    const targetOpts = flags.targets ? flags.targets.split(',') : undefined
    this.buildConfig = await Tarballs.buildConfig(flags.root, {targets: targetOpts})
    const {s3Config, targets, dist, version, config} = this.buildConfig
    if (!await qq.exists(dist(config.s3Key('versioned', {ext: '.tar.gz'})))) this.error('run "oclif-dev pack" before publishing')
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }
    // for (let target of targets) await this.uploadNodeBinary(target)
    const ManifestS3Options = {...S3Options, CacheControl: 'max-age=86400', ContentType: 'application/json'}
    const uploadTarball = async (options?: {platform: PlatformTypes; arch: ArchTypes}) => {
      const TarballS3Options = {...S3Options, CacheControl: 'max-age=604800'}
      const releaseTarballs = async (ext: '.tar.gz' | '.tar.xz') => {
        const versioned = config.s3Key('versioned', ext, options)
        const unversioned = config.s3Key('unversioned', ext, options)
        await aws.s3.uploadFile(dist(versioned), {...TarballS3Options, ContentType: 'application/gzip', Key: versioned})
        await aws.s3.uploadFile(dist(versioned), {...TarballS3Options, ContentType: 'application/gzip', Key: unversioned})
      }
      await releaseTarballs('.tar.gz')
      if (this.buildConfig.xz) await releaseTarballs('.tar.xz')
      const manifest = config.s3Key('manifest', options)
      await aws.s3.uploadFile(dist(manifest), {...ManifestS3Options, Key: manifest})
    }
    if (targets.length > 0) log('uploading targets')
    // eslint-disable-next-line no-await-in-loop
    for (const target of targets) await uploadTarball(target)
    log('uploading vanilla')
    await uploadTarball()

    log(`published ${version}`)
  }

  // private async uploadNodeBinary(target: Tarballs.ITarget) {
  //   const {platform, arch} = target
  //   log('checking for node binary %s-%s in S3', platform, arch)
  //   const {nodeVersion, dist, tmp, s3Config} = this.buildConfig
  //   let key = path.join('node', `node-v${nodeVersion}`, `node-v${nodeVersion}-${platform}-${arch}`)
  //   let Key = (platform === 'win32' ? `${key}.exe` : key) + '.gz'
  //   try {
  //     await s3.headObject({Bucket: s3Config.bucket!, Key})
  //   } catch (err) {
  //     if (err.code !== 'NotFound') throw err
  //     log('uploading node binary %s-%s', target.platform, target.arch)
  //     let output = dist(key)
  //     output = await Tarballs.fetchNodeBinary({nodeVersion, platform, arch, output, tmp})
  //     await qq.x('gzip', ['-f', output])
  //     await s3.uploadFile(output + '.gz', {Bucket: s3Config.bucket!, Key})
  //   }
  // }
}
