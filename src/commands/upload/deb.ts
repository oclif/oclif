import {Command, Flags} from '@oclif/core'
import * as qq from 'qqjs'

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
    const dist = (f: string) => buildConfig.dist(qq.join('deb', f))
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    if (!await qq.exists(dist('Release'))) this.error('Cannot find debian artifacts', {
      suggestions: ['Run "oclif pack deb" before uploading'],
    })

    const cloudKeyBase = commitAWSDir(config.pjson.version, buildConfig.gitSha, s3Config)
    const upload = (file: string) => {
      const cloudKey = `${cloudKeyBase}/apt/${file}`
      return aws.s3.uploadFile(dist(file), {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey})
    }

    const uploadDeb = async (arch: 'amd64' | 'i386') => {
      const deb = templateShortKey('deb', {bin: config.bin, versionShaRevision: debVersion(buildConfig), arch: arch as any})
      if (await qq.exists(dist(deb))) await upload(deb)
    }

    await uploadDeb('amd64')
    await uploadDeb('i386')
    await upload('Packages.gz')
    await upload('Packages.xz')
    await upload('Packages.bz2')
    await upload('Release')
    if (await qq.exists(dist('InRelease'))) await upload('InRelease')
    if (await qq.exists(dist('Release.gpg'))) await upload('Release.gpg')

    log(`done uploading deb artifacts for v${config.version}-${buildConfig.gitSha}`)
  }
}
