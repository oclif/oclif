import {Command, flags} from '@oclif/command'

import aws from '../aws'
import * as Tarballs from '../tarballs'
import {cli} from 'cli-ux'

export default class Promote extends Command {
  static hidden = true

  static description = 'promote CLI builds to a S3 release channel'

  static flags = {
    root: flags.string({char: 'r', description: 'path to the oclif CLI project root', default: '.', required: true}),
    version: flags.string({description: 'semantic version of the CLI to promote', required: true}),
    sha: flags.string({description: '7-digit short git commit SHA of the CLI to promote', required: true}),
    channel: flags.string({description: 'which channel to promote to', required: true, default: 'stable'}),
    targets: flags.enum({char: 't', description: 'comma-separated targets to promote (e.g.: linux-arm,win32-x64)', options: Tarballs.TARGETS, default: Tarballs.TARGETS}),
    deb: flags.boolean({char: 'd', description: 'promote debian artifacts'}),
    macos: flags.boolean({char: 'm', description: 'promote MacOS pkg'}),
    win: flags.boolean({char: 'w', description: 'promote Windows exe'}),
  }

  async run() {
    const {flags} = this.parse(Promote)

    const buildConfig = await Tarballs.buildConfig(flags.root, {targets: flags.targets})
    const {s3Config, config} = buildConfig

    if (!s3Config.bucket) this.error('Cannot determine S3 bucket for promotion')

    const s3VersionObjKey = (object: string, opts: {debian?: boolean} = {}): string => {
      const apt = opts.debian ? 'apt/' : ''
      return `versions/${flags.version}/${flags.sha}/${apt}${object}`
    }
    const s3ManifestChannelKey = (object: string, opts: {debian?: boolean } = {}): string => {
      const apt = opts.debian ? 'apt/' : ''
      return `channel/${flags.channel}/${apt}${object}`
    }

    // copy tarballs manifests
    for (const target of Tarballs.TARGETS) {
      const manifest = `${target}-buildmanifest`
      const copySource = `${s3Config.bucket}/${s3VersionObjKey(manifest)}`
      const key = s3ManifestChannelKey(manifest)
      // console.log(copySource, key)
      cli.action.start(`Promoting ${manifest} to ${flags.channel}`)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: copySource,
          Key: key,
        },
      )
      cli.action.stop('successfully')
    }

    // copy darwin pkg
    const darwinPkgObject = `${config.bin}.pkg`
    const darwinCopySource = `${s3Config.bucket}/${s3VersionObjKey(darwinPkgObject)}`
    const darwinKey = s3ManifestChannelKey(darwinPkgObject)
    // console.log(darwinCopySource, darwinKey)
    cli.action.start(`Promoting ${darwinPkgObject} to ${flags.channel}`)
    await aws.s3.copyObject(
      {
        Bucket: s3Config.bucket,
        CopySource: darwinCopySource,
        Key: darwinKey,
      },
    )
    cli.action.stop('successfully')

    // copy win exe
    for (const arch of ['x64', 'x86']) {
      const winPkgObject = `${config.bin}-${arch}.exe`
      const winCopySource = `${s3Config.bucket}/${s3VersionObjKey(winPkgObject)}`
      const winKey = s3ManifestChannelKey(winPkgObject)
      // console.log(winCopySource, winKey)
      cli.action.start(`Promoting ${winPkgObject} to ${flags.channel}`)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: winCopySource,
          Key: winKey,
        },
      )
      cli.action.stop('successfully')
    }

    // copy debian artifacts
    const debArtifacts = [
      `${config.bin}_amd64.deb`,
      `${config.bin}_i386.deb`,
      'Packages.gz',
      'Packages.xz',
      'Packages.bz2',
      'Release',
      'InRelease',
      'Release.gpg',
    ]
    for (const artifact of debArtifacts) {
      const debCopySource = `${s3Config.bucket}/${s3VersionObjKey(artifact, {debian: true})}`
      const debKey = s3ManifestChannelKey(artifact, {debian: true})
      // console.log(debCopySource, debKey)
      cli.action.start(`Promoting ${artifact} to ${flags.channel}`)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: s3Config.bucket,
          CopySource: debCopySource,
          Key: debKey,
        },
      )
      cli.action.stop('successfully')
    }
  }
}
