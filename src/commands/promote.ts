import {Command, flags} from '@oclif/command'

import aws from '../aws'
import * as Tarballs from '../tarballs'
import {TARGETS} from '../tarballs/config'
import {cli} from 'cli-ux'

export default class Promote extends Command {
  static hidden = true

  static description = 'promote CLI builds to a S3 release channel'

  static flags = {
    root: flags.string({char: 'r', description: 'path to the oclif CLI root', default: '.', required: true}),
    version: flags.string({description: 'semantic version of the CLI to promote', required: true}),
    sha: flags.string({description: '7-digit short git commit SHA of the CLI to promote', required: true}),
    channel: flags.string({description: 'which channel to promote to', required: true, default: 'stable'}),
  }

  async run() {
    const {flags} = this.parse(Promote)
    const {channel, sha, version, root} = flags

    const buildConfig = await Tarballs.buildConfig(root)
    const bucket = buildConfig.s3Config.bucket!
    if (!bucket) this.error('Cannot determine S3 bucket for promotion')
    const bin = buildConfig.config.bin

    const s3VersionObjKey = (object: string, opts: {debian?: boolean} = {}): string => {
      const apt = opts.debian ? 'apt/' : ''
      return `versions/${version}/${sha}/${apt}${object}`
    }
    const s3ManifestChannelKey = (object: string, opts: {debian?: boolean } = {}): string => {
      const apt = opts.debian ? 'apt/' : ''
      return `channel/${channel}/${apt}${object}`
    }

    // copy tarballs manifests
    for (const target of TARGETS) {
      const manifest = `${target}-buildmanifest`
      const copySource = `${bucket}/${s3VersionObjKey(manifest)}`
      const key = s3ManifestChannelKey(manifest)
      // console.log(copySource, key)
      cli.action.start(`Promoting ${manifest} to ${channel}`)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: bucket,
          CopySource: copySource,
          Key: key,
        },
      )
      cli.action.stop('successfully')
    }

    // copy darwin pkg
    const darwinPkgObject = `${bin}.pkg`
    const darwinCopySource = `${bucket}/${s3VersionObjKey(darwinPkgObject)}`
    const darwinKey = s3ManifestChannelKey(darwinPkgObject)
    // console.log(darwinCopySource, darwinKey)
    cli.action.start(`Promoting ${darwinPkgObject} to ${channel}`)
    await aws.s3.copyObject(
      {
        Bucket: bucket,
        CopySource: darwinCopySource,
        Key: darwinKey,
      },
    )
    cli.action.stop('successfully')

    // copy win exe
    for (const arch of ['x64', 'x86']) {
      const winPkgObject = `${bin}-${arch}.exe`
      const winCopySource = `${bucket}/${s3VersionObjKey(winPkgObject)}`
      const winKey = s3ManifestChannelKey(winPkgObject)
      // console.log(winCopySource, winKey)
      cli.action.start(`Promoting ${winPkgObject} to ${channel}`)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: bucket,
          CopySource: winCopySource,
          Key: winKey,
        },
      )
      cli.action.stop('successfully')
    }

    // copy debian artifacts
    const debArtifacts = [
      `${bin}_amd64.deb`,
      `${bin}_i386.deb`,
      'Packages.gz',
      'Packages.xz',
      'Packages.bz2',
      'Release',
      'InRelease',
      'Release.gpg',
    ]
    for (const artifact of debArtifacts) {
      const debCopySource = `${bucket}/${s3VersionObjKey(artifact, {debian: true})}`
      const debKey = s3ManifestChannelKey(artifact, {debian: true})
      // console.log(debCopySource, debKey)
      cli.action.start(`Promoting ${artifact} to ${channel}`)
      // eslint-disable-next-line no-await-in-loop
      await aws.s3.copyObject(
        {
          Bucket: bucket,
          CopySource: debCopySource,
          Key: debKey,
        },
      )
      cli.action.stop('successfully')
    }
  }
}
