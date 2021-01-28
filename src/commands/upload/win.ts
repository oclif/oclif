import {Command, flags} from '@oclif/command'
import * as qq from 'qqjs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir} from '../../upload-util'

export default class UploadWin extends Command {
  static hidden = true

  static description = 'upload windows installers built with pack:win'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run() {
    const {flags} = this.parse(UploadWin)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {s3Config, version, config, dist} = buildConfig
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    for (const arch of ['x64', 'x86']) {
      const key = dist(`win/${config.bin}-v${version}-${arch}.exe`)
      // eslint-disable-next-line no-await-in-loop
      if (!await qq.exists(key)) this.error(`Cannot find Windows exe for ${arch}`, {
        suggestions: ['Run "oclif-dev pack:win" before uploading'],
      })
    }

    const root = commitAWSDir(config.pjson.version, config.root)
    const uploadWin = async (arch: 'x64' | 'x86') => {
      const localExe = dist(`win/${config.bin}-v${version}-${arch}.exe`)
      const cloudKey = `${root}/${config.bin}-${arch}.exe`
      if (await qq.exists(localExe)) await aws.s3.uploadFile(localExe, {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey})
    }
    await uploadWin('x64')
    await uploadWin('x86')

    log(`uploaded win ${version}`)
  }
}
