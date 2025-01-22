import {Command, Flags} from '@oclif/core'
import * as fs from 'node:fs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, templateShortKey} from '../../upload-util'

export default class UploadWin extends Command {
  static description = 'Upload windows installers built with `pack win`.'
  static flags = {
    'dry-run': Flags.boolean({description: 'Run the command without uploading to S3.'}),
    root: Flags.string({char: 'r', default: '.', description: 'Path to oclif CLI root.', required: true}),
    targets: Flags.string({description: 'Comma-separated targets to pack (e.g.: win32-x64,win32-x86,win32-arm64).'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UploadWin)
    const buildConfig = await Tarballs.buildConfig(flags.root, {targets: flags?.targets?.split(',')})
    const {config, dist, s3Config} = buildConfig
    const S3Options = {
      ACL: s3Config.acl || 'public-read',
      Bucket: s3Config.bucket!,
    }

    const archs = buildConfig.targets.filter((t) => t.platform === 'win32').map((t) => t.arch)

    for (const arch of archs) {
      const templateKey = templateShortKey('win32', {
        arch,
        bin: config.bin,
        sha: buildConfig.gitSha,
        version: config.version,
      })
      const localKey = dist(`win32/${templateKey}`)
      if (!fs.existsSync(localKey))
        this.error(`Cannot find Windows exe for ${arch}`, {
          suggestions: ['Run "oclif pack win" before uploading'],
        })
    }

    const cloudKeyBase = commitAWSDir(config.pjson.version, buildConfig.gitSha, s3Config)
    const uploadWin = async (arch: 'arm64' | 'x64' | 'x86') => {
      const templateKey = templateShortKey('win32', {
        arch,
        bin: config.bin,
        sha: buildConfig.gitSha,
        version: config.version,
      })
      const localExe = dist(`win32/${templateKey}`)
      const cloudKey = `${cloudKeyBase}/${templateKey}`
      if (fs.existsSync(localExe))
        await aws.s3.uploadFile(
          localExe,
          {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey},
          {
            dryRun: flags['dry-run'],
          },
        )
    }

    await Promise.all([uploadWin('x64'), uploadWin('x86'), uploadWin('arm64')])

    log(`done uploading windows executables for v${config.version}-${buildConfig.gitSha}`)
  }
}
