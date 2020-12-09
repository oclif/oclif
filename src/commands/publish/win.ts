import {Command, flags} from '@oclif/command'
import * as qq from 'qqjs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'

export default class PublishWin extends Command {
  static hidden = true

  static description = 'publish windows installers built with pack:win'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run() {
    const {flags} = this.parse(PublishWin)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {s3Config, version, config} = buildConfig
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    const root = buildConfig.channel === 'stable' ? '' : `channels/${buildConfig.channel}/`
    const uploadWin = async (arch: 'x64' | 'x86') => {
      const exe = buildConfig.dist(`win/${config.bin}-v${buildConfig.version}-${arch}.exe`)
      if (await qq.exists(exe)) await aws.s3.uploadFile(exe, {...S3Options, CacheControl: 'max-age=86400', Key: `${root}${config.bin}-${arch}.exe`})
    }
    await uploadWin('x64')
    await uploadWin('x86')

    log(`published win ${version}`)
  }
}
