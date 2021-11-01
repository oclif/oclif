import {Command, Flags} from '@oclif/core'
import * as qq from 'qqjs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, templateShortKey} from '../../upload-util'

export default class UploadMacos extends Command {
  static description = 'upload macos installers built with pack:macos'

  static flags = {
    root: Flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run() {
    const {flags} = await this.parse(UploadMacos)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {s3Config, config, dist} = buildConfig
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }
    const cloudKeyBase = commitAWSDir(config.version, buildConfig.gitSha, s3Config)
    const templateKey = templateShortKey('macos', {bin: config.bin, version: config.version, sha: buildConfig.gitSha})
    const cloudKey = `${cloudKeyBase}/${templateKey}`
    const localPkg = dist(`macos/${templateKey}`)

    if (await qq.exists(localPkg)) await aws.s3.uploadFile(localPkg, {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey})
    else this.error('Cannot find macOS pkg', {
      suggestions: ['Run "oclif-dev pack:macos" before uploading'],
    })

    log(`done uploading macos pkg for v${config.version}-${buildConfig.gitSha}`)
  }
}
