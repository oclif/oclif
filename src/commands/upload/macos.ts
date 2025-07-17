import {Command, Flags, Interfaces} from '@oclif/core'
import * as fs from 'node:fs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, templateShortKey} from '../../upload-util'
import {uniq} from '../../util'

export default class UploadMacos extends Command {
  static description = 'Upload macos installers built with `pack macos`.'
  static flags = {
    'dry-run': Flags.boolean({description: 'Run the command without uploading to S3.'}),
    root: Flags.string({char: 'r', default: '.', description: 'Path to oclif CLI root.', required: true}),
    sha: Flags.string({
      description: '7-digit short git commit SHA (defaults to current checked out commit).',
      required: false,
    }),
    targets: Flags.string({
      char: 't',
      description: 'Comma-separated targets to upload (e.g.: darwin-x64,darwin-arm64).',
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UploadMacos)
    const buildConfig = await Tarballs.buildConfig(flags.root, {sha: flags?.sha, targets: flags?.targets?.split(',')})
    const {config, dist, s3Config} = buildConfig
    const S3Options = {
      ACL: s3Config.acl || 'public-read',
      Bucket: s3Config.bucket!,
    }
    const cloudKeyBase = commitAWSDir(config.version, buildConfig.gitSha, s3Config)

    const upload = async (arch: Interfaces.ArchTypes) => {
      const templateKey = templateShortKey('macos', {
        arch,
        bin: config.bin,
        sha: buildConfig.gitSha,
        version: config.version,
      })
      const cloudKey = `${cloudKeyBase}/${templateKey}`
      const localPkg = dist(`macos/${templateKey}`)

      if (fs.existsSync(localPkg))
        await aws.s3.uploadFile(
          localPkg,
          {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey},
          {
            dryRun: flags['dry-run'],
          },
        )
      else
        this.error('Cannot find macOS pkg', {
          suggestions: ['Run "oclif pack macos" before uploading'],
        })
    }

    const arches = uniq(buildConfig.targets.filter((t) => t.platform === 'darwin').map((t) => t.arch))
    await Promise.all(arches.map((a) => upload(a)))

    log(`done uploading macos pkgs for v${config.version}-${buildConfig.gitSha}`)
  }
}
