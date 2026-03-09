import {Command, Flags, Interfaces, ux} from '@oclif/core'
import * as fs from 'node:fs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {s3Keys} from '../../upload-util'

export default class UploadTarballs extends Command {
  static description = 'Upload an oclif CLI to S3.'
  static flags = {
    'dry-run': Flags.boolean({description: 'Run the command without uploading to S3.'}),
    root: Flags.string({char: 'r', default: '.', description: 'Path to oclif CLI root.', required: true}),
    sha: Flags.string({
      description: '7-digit short git commit SHA (defaults to current checked out commit).',
      required: false,
    }),
    targets: Flags.string({char: 't', description: 'Comma-separated targets to upload (e.g.: linux-arm,win32-x64).'}),
    xz: Flags.boolean({allowNo: true, description: 'Also upload xz.'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UploadTarballs)
    const buildConfig = await Tarballs.buildConfig(flags.root, {
      sha: flags?.sha,
      targets: flags?.targets?.split(','),
      xz: flags.xz,
    })
    const {config, dist, s3Config, xz} = buildConfig
    const keys = s3Keys(config, s3Config, {bin: config.bin, sha: buildConfig.gitSha, version: config.version})

    // fail early if targets are not built
    for (const target of buildConfig.targets) {
      const tarball = dist(keys.versioned('.tar.gz', {arch: target.arch, platform: target.platform}))
      if (!fs.existsSync(tarball))
        this.error(`Cannot find a tarball ${tarball} for ${target.platform}-${target.arch}`, {
          suggestions: [`Run "oclif pack --target ${target.platform}-${target.arch}" before uploading`],
        })
    }

    const S3Options = {
      ACL: s3Config.acl || 'public-read',
      Bucket: s3Config.bucket!,
    }

    const uploadTarball = async (options?: {arch: Interfaces.ArchTypes; platform: Interfaces.PlatformTypes}) => {
      const target = {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        arch: options?.arch!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        platform: options?.platform!,
      }

      const releaseTarballs = async (ext: '.tar.gz' | '.tar.xz') => {
        const localKey = keys.versioned(ext, target)
        const cloudKey = keys.cloudKey(localKey)
        await aws.s3.uploadFile(
          dist(localKey),
          {
            ...S3Options,
            CacheControl: 'max-age=604800',
            ContentType: 'application/gzip',
            Key: cloudKey,
          },
          {
            dryRun: flags['dry-run'],
          },
        )
      }

      const maybeUploadManifest = async () => {
        const manifest = keys.manifest(target)
        const cloudKey = keys.cloudKey(manifest)
        const local = dist(manifest)
        log(`checking for buildmanifest at ${local}`)
        if (fs.existsSync(local)) {
          log(`uploading buildmanifest ${manifest}`)
          return aws.s3.uploadFile(
            dist(manifest),
            {
              ...S3Options,
              CacheControl: 'max-age=86400',
              ContentType: 'application/json',
              Key: cloudKey,
            },
            {
              dryRun: flags['dry-run'],
            },
          )
        }

        ux.warn(`Cannot find buildmanifest ${local}. CLI will not be able to update itself.`)
      }

      await Promise.all([
        releaseTarballs('.tar.gz'),
        maybeUploadManifest(),
        ...(xz ? [releaseTarballs('.tar.xz')] : []),
      ])
    }

    if (buildConfig.targets.length > 0) log('uploading targets')
    await Promise.all(buildConfig.targets.map((t) => uploadTarball(t)))
    log(`done uploading tarballs & manifests for v${config.version}-${buildConfig.gitSha}`)
  }
}
