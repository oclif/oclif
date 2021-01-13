import {Command, flags} from '@oclif/command'
import * as qq from 'qqjs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir} from '../../upload-util'

export default class UploadMacos extends Command {
  static hidden = true

  static description = 'upload macos installers built with pack:macos'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run() {
    const {flags} = this.parse(UploadMacos)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {s3Config, version, config} = buildConfig
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    const root = commitAWSDir(config.pjson.version)
    const pkg = buildConfig.dist(`macos/${config.bin}-v${buildConfig.version}.pkg`)
    const key = `${root}${config.bin}.pkg`
    if (await qq.exists(pkg)) await aws.s3.uploadFile(pkg, {...S3Options, CacheControl: 'max-age=86400', Key: key})

    log(`uploaded macos ${version}`)
  }
}
