import {Command, Flags} from '@oclif/core'
import {Interfaces} from '@oclif/core'
import * as fs from 'fs'
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
    targets: Flags.string({char: 't', description: 'comma-separated targets to upload (e.g.: linux-arm,win32-x64)'}),
    xz: Flags.boolean({description: 'also upload xz', allowNo: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UploadTarballs)
    if (process.platform === 'win32') throw new Error('upload does not function on windows')
    const buildConfig = await Tarballs.buildConfig(flags.root, {xz: flags.xz, targets: flags?.targets?.split(',')})
    const {s3Config, dist, config, xz} = buildConfig

    // fail early if targets are not built
    for (const target of buildConfig.targets) {
      const tarball = dist(templateShortKey('versioned', {ext: '.tar.gz', bin: config.bin, version: config.version, sha: buildConfig.gitSha, ...target}))
      if (!fs.existsSync(tarball)) this.error(`Cannot find a tarball ${tarball} for ${target.platform}-${target.arch}`, {
        suggestions: [`Run "oclif pack --target ${target.platform}-${target.arch}" before uploading`],
      })
    }

    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    const uploadTarball = async (options?: { platform: Interfaces.PlatformTypes; arch: Interfaces.ArchTypes}) => {
      const shortKeyInputs =  {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        arch: options?.arch!,
        bin: config.bin,
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        platform: options?.platform!,
        sha: buildConfig.gitSha,
        version: config.version,
      }

      const releaseTarballs = async (ext: '.tar.gz' | '.tar.xz') => {
        const localKey = templateShortKey('versioned', ext, shortKeyInputs)
        const cloudKey = `${commitAWSDir(config.version, buildConfig.gitSha, s3Config)}/${localKey}`
        await aws.s3.uploadFile(dist(localKey), {...S3Options, CacheControl: 'max-age=604800', ContentType: 'application/gzip', Key: cloudKey})
      }

      const manifest = templateShortKey('manifest', shortKeyInputs)
      const cloudKey = `${commitAWSDir(config.version, buildConfig.gitSha, s3Config)}/${manifest}`

      await Promise.all([releaseTarballs('.tar.gz'),  aws.s3.uploadFile(dist(manifest), {...S3Options, CacheControl: 'max-age=86400', ContentType: 'application/json', Key: cloudKey})].concat(xz ? [releaseTarballs('.tar.xz')] : []))
    }

    if (buildConfig.targets.length > 0) log('uploading targets')
    await Promise.all(buildConfig.targets.map(t => uploadTarball(t)))
    log(`done uploading tarballs & manifests for v${config.version}-${buildConfig.gitSha}`)
  }
}
