import {Command, Flags} from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'
import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, templateShortKey, debVersion} from '../../upload-util'

export default class UploadDeb extends Command {
  static description = 'upload deb package built with pack:deb'

  static flags = {
    root: Flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UploadDeb)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {s3Config, config} = buildConfig
    const dist = (f: string) => buildConfig.dist(path.join('deb', f))
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    if (!fs.existsSync(dist('Release'))) this.error('Cannot find debian artifacts', {
      suggestions: ['Run "oclif pack deb" before uploading'],
    })

    const cloudKeyBase = commitAWSDir(config.pjson.version, buildConfig.gitSha, s3Config)
    const upload = (file: string) => {
      const cloudKey = `${cloudKeyBase}/apt/${file}`
      return aws.s3.uploadFile(dist(file), {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey})
    }

    // apt expects ../apt/dists/versionName/[artifacts] but oclif wants versions/sha/apt/[artifacts]
    // see https://github.com/oclif/oclif/issues/347 for the AWS-redirect that solves this
    // this workaround puts the code in both places that the redirect was doing
    // with this, the docs are correct. The copies are all done in parallel so it shouldn't be too costly.
    const uploadWorkaround = (file: string) => {
      const cloudKey = `${cloudKeyBase}/apt/./${file}`
      return aws.s3.uploadFile(dist(file), {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey})
    }

    const uploadDeb = async (arch: 'amd64' | 'i386') => {
      const deb = templateShortKey('deb', {bin: config.bin, versionShaRevision: debVersion(buildConfig), arch: arch as any})
      if (fs.existsSync(dist(deb))) await Promise.all([upload(deb), uploadWorkaround(deb)])
    }

    log(`starting upload of deb artifacts for v${config.version}-${buildConfig.gitSha}`)

    await Promise.all([
      uploadDeb('amd64'),
      uploadDeb('i386'),
      upload('Packages.gz'),
      upload('Packages.xz'),
      upload('Packages.bz2'),
      upload('Release'),
      uploadWorkaround('Packages.gz'),
      uploadWorkaround('Packages.xz'),
      uploadWorkaround('Packages.bz2'),
      uploadWorkaround('Release'),
    ].concat(
      fs.existsSync(dist('InRelease')) ? [upload('InRelease'), uploadWorkaround('InRelease')] : [],
      fs.existsSync(dist('Release.gpg')) ? [upload('Release.gpg'), uploadWorkaround('Release.gpg')] : [],
    ))
    log(`done uploading deb artifacts for v${config.version}-${buildConfig.gitSha}`)
  }
}
