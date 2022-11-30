import {Interfaces} from '@oclif/core'

import * as Lodash from 'lodash'
import * as path from 'path'

import {BuildConfig as TarballConfig} from './tarballs/config'

export function commitAWSDir(version: string, sha: string, s3Config: TarballConfig['s3Config']): string {
  let s3SubDir = s3Config.folder || ''
  if (s3SubDir !== '' && s3SubDir.slice(-1) !== '/') s3SubDir = `${s3SubDir}/`
  return path.join(s3SubDir, 'versions', version, sha)
}

export function channelAWSDir(channel: string, s3Config: TarballConfig['s3Config']): string {
  let s3SubDir = s3Config.folder || ''
  if (s3SubDir !== '' && s3SubDir.slice(-1) !== '/') s3SubDir = `${s3SubDir}/`
  return path.join(s3SubDir, 'channels', channel)
}

// to-do:
// When this pkg starts using oclif/core
// refactor this key name lookup
// helper to oclif/core
export function templateShortKey(
  type: keyof Interfaces.PJSON.S3.Templates | 'macos' | 'win32' | 'deb', ext?: '.tar.gz' | '.tar.xz' | Interfaces.Config.s3Key.Options,
  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  options: Interfaces.Config.s3Key.Options = {root: '.'},
): string {
  if (typeof ext === 'object') options = Object.assign(options, ext)
  else if (ext) options.ext = ext
  const _: typeof Lodash = require('lodash')
  const templates = {
    baseDir: '<%- bin %>',
    unversioned: '<%- bin %>-<%- platform %>-<%- arch %><%- ext %>',
    versioned: '<%- bin %>-v<%- version %>-<%- sha %>-<%- platform %>-<%- arch %><%- ext %>',
    manifest: '<%- bin %>-v<%- version %>-<%- sha %>-<%- platform %>-<%- arch %>-buildmanifest',
    macos: '<%- bin %>-v<%- version %>-<%- sha %>-<%- arch %>.pkg',
    win32: '<%- bin %>-v<%- version %>-<%- sha %>-<%- arch %>.exe',
    deb: '<%- bin %>_<%- versionShaRevision %>_<%- arch %>.deb',
  }
  return _.template(templates[type])({...options})
}

export function debArch(arch: Interfaces.ArchTypes): string {
  if (arch === 'x64') return 'amd64'
  if (arch === 'x86') return 'i386'
  if (arch === 'arm') return 'armel'
  throw new Error(`invalid arch: ${arch}`)
}

export function debVersion(buildConfig: TarballConfig): string {
  return `${buildConfig.config.version.split('-')[0]}.${buildConfig.gitSha}-1`
  // see debian_revision: https://www.debian.org/doc/debian-policy/ch-controlfields.html
}
