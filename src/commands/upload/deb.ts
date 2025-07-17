import {Command, Flags} from '@oclif/core'
import * as fs from 'node:fs'
import path from 'node:path'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, DebArch, debArch, debVersion, templateShortKey} from '../../upload-util'

export default class UploadDeb extends Command {
  static description = 'Upload deb package built with `pack deb`.'
  static flags = {
    'dry-run': Flags.boolean({description: 'Run the command without uploading to S3.'}),
    root: Flags.string({char: 'r', default: '.', description: 'Path to oclif CLI root.', required: true}),
    sha: Flags.string({
      description: '7-digit short git commit SHA (defaults to current checked out commit).',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UploadDeb)
    const buildConfig = await Tarballs.buildConfig(flags.root, {sha: flags?.sha})
    const {config, s3Config} = buildConfig
    const dist = (f: string) => buildConfig.dist(path.join('deb', f))
    const S3Options = {
      ACL: s3Config.acl || 'public-read',
      Bucket: s3Config.bucket!,
    }

    if (!fs.existsSync(dist('Release')))
      this.error('Cannot find debian artifacts', {
        suggestions: ['Run "oclif pack deb" before uploading'],
      })

    const cloudKeyBase = commitAWSDir(config.pjson.version, buildConfig.gitSha, s3Config)
    const upload = (file: string) => {
      const cloudKey = `${cloudKeyBase}/apt/${file}`
      return aws.s3.uploadFile(
        dist(file),
        {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey},
        {
          dryRun: flags['dry-run'],
        },
      )
    }

    // apt expects ../apt/dists/versionName/[artifacts] but oclif wants versions/sha/apt/[artifacts]
    // see https://github.com/oclif/oclif/issues/347 for the AWS-redirect that solves this
    // this workaround puts the code in both places that the redirect was doing
    // with this, the docs are correct. The copies are all done in parallel so it shouldn't be too costly.
    const uploadWorkaround = (file: string) => {
      const cloudKey = `${cloudKeyBase}/apt/./${file}`
      return aws.s3.uploadFile(
        dist(file),
        {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey},
        {
          dryRun: flags['dry-run'],
        },
      )
    }

    const uploadDeb = async (arch: DebArch) => {
      const deb = templateShortKey('deb', {
        arch,
        bin: config.bin,
        versionShaRevision: debVersion(buildConfig),
      })
      if (fs.existsSync(dist(deb))) await Promise.all([upload(deb), uploadWorkaround(deb)])
    }

    log(`starting upload of deb artifacts for v${config.version}-${buildConfig.gitSha}`)
    const arches = buildConfig.targets.filter((t) => t.platform === 'linux')

    await Promise.all([
      ...arches.map((a) => uploadDeb(debArch(a.arch))),
      upload('Packages.gz'),
      upload('Packages.xz'),
      upload('Packages.bz2'),
      upload('Release'),
      uploadWorkaround('Packages.gz'),
      uploadWorkaround('Packages.xz'),
      uploadWorkaround('Packages.bz2'),
      uploadWorkaround('Release'),
      ...(fs.existsSync(dist('InRelease')) ? [upload('InRelease'), uploadWorkaround('InRelease')] : []),
      ...(fs.existsSync(dist('Release.gpg')) ? [upload('Release.gpg'), uploadWorkaround('Release.gpg')] : []),
    ])
    log(`done uploading deb artifacts for v${config.version}-${buildConfig.gitSha}`)
  }
}
