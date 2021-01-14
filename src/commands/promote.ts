import {Command, flags} from '@oclif/command'

import aws from '../aws'
import * as Tarballs from '../tarballs'
import {TARGETS} from '../tarballs/config'

export default class Promote extends Command {
  static hidden = true

  static description = 'promote cli builds on s3 into a release channel'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    version: flags.string({description: 'semantic version of cli to promot', required: true}),
    sha: flags.string({description: '7-digit commit git SHA of cli to promote', required: true}),
    channel: flags.string({description: 'which channel to promote to', required: true, default: 'stable'}),
  }

  async run() {
    const {flags} = this.parse(Promote)
    const {channel, sha, version, root} = flags

    const buildConfig = await Tarballs.buildConfig(root)
    const bucket = buildConfig.s3Config.bucket!
    if (!bucket) this.error('Cannot determine s3 bucket for promotion')

    // 1. copy tarballs
    const artifacts = TARGETS
    for (const artifact of artifacts) {
      const s3ManifestKey = (): string => {
        return `versions/${version}/${sha}/${artifact}`
      }
      const s3ManifestChannelKey = (): string => {
        return `channel/${channel}/${artifact}`
      }

      aws.s3.copyObject(
        {
          Bucket: bucket,
          CopySource: s3ManifestKey(),
          Key: s3ManifestChannelKey(),
        },
      )
    }

    // to-do: copy darwin, win & debian
  }
}
