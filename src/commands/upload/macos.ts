import * as _ from 'lodash'
import * as qq from 'qqjs'

import {Command, Flags, Interfaces} from '@oclif/core'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, templateShortKey} from '../../upload-util'

export default class UploadMacos extends Command {
  static description = 'upload macos installers built with pack:macos'

  static flags = {
    root: Flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UploadMacos)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {s3Config, config, dist} = buildConfig
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }
    const cloudKeyBase = commitAWSDir(config.version, buildConfig.gitSha, s3Config)

    const upload = async (arch: Interfaces.ArchTypes) => {
      const templateKey = templateShortKey('macos', {bin: config.bin, version: config.version, sha: buildConfig.gitSha, arch})
      const cloudKey = `${cloudKeyBase}/${templateKey}`
      const localPkg = dist(`macos/${templateKey}`)

      if (await qq.exists(localPkg)) await aws.s3.uploadFile(localPkg, {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey})
      else this.error('Cannot find macOS pkg', {
        suggestions: ['Run "oclif pack macos" before uploading'],
      })
    }

    const arches = _.uniq(buildConfig.targets
    .filter(t => t.platform === 'darwin')
    .map(t => t.arch))
    // eslint-disable-next-line no-await-in-loop
    for (const a of arches) await upload(a)

    log(`done uploading macos pkgs for v${config.version}-${buildConfig.gitSha}`)
  }
}
