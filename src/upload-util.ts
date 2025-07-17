import {Interfaces} from '@oclif/core'
import {render} from 'ejs'
import path from 'node:path'

import {BuildConfig as TarballConfig} from './tarballs/config'

export function commitAWSDir(version: string, sha: string, s3Config: TarballConfig['s3Config']): string {
  let s3SubDir = s3Config.folder || ''
  if (s3SubDir !== '' && s3SubDir.slice(-1) !== '/') s3SubDir = `${s3SubDir}/`
  return path.posix.join(s3SubDir, 'versions', version, sha)
}

export function channelAWSDir(channel: string, s3Config: TarballConfig['s3Config']): string {
  let s3SubDir = s3Config.folder || ''
  if (s3SubDir !== '' && s3SubDir.slice(-1) !== '/') s3SubDir = `${s3SubDir}/`
  return path.posix.join(s3SubDir, 'channels', channel)
}

type TemplateOptions =
  | Interfaces.Config.s3Key.Options
  | {
      arch?: DebArch | Interfaces.ArchTypes
      bin?: string
      ext?: '.tar.gz' | '.tar.xz'
      sha?: string
      version?: string
      versionShaRevision?: string
    }

// TODO: refactor this key name lookup helper to oclif/core
export function templateShortKey(
  type: 'deb' | 'macos' | 'win32' | keyof Interfaces.S3Templates,
  options?: TemplateOptions,
): string {
  if (!options)
    options = {
      root: '.',
    }
  const templates = {
    baseDir: '<%- bin %>',
    deb: '<%- bin %>_<%- versionShaRevision %>_<%- arch %>.deb',
    macos: '<%- bin %>-v<%- version %>-<%- sha %>-<%- arch %>.pkg',
    manifest: '<%- bin %>-v<%- version %>-<%- sha %>-<%- platform %>-<%- arch %>-buildmanifest',
    unversioned: '<%- bin %>-<%- platform %>-<%- arch %><%- ext %>',
    versioned: '<%- bin %>-v<%- version %>-<%- sha %>-<%- platform %>-<%- arch %><%- ext %>',
    win32: '<%- bin %>-v<%- version %>-<%- sha %>-<%- arch %>.exe',
  }
  return render(templates[type], {...options})
}

export type DebArch = 'amd64' | 'arm64' | 'armel' | 'i386'

export function debArch(arch: Interfaces.ArchTypes): DebArch {
  if (arch === 'x64') return 'amd64'
  if (arch === 'x86') return 'i386'
  if (arch === 'arm') return 'armel'
  if (arch === 'arm64') return 'arm64'
  throw new Error(`invalid arch: ${arch}`)
}

export function debVersion(buildConfig: TarballConfig): string {
  return `${buildConfig.config.version.split('-')[0]}.${buildConfig.gitSha}-1`
  // see debian_revision: https://www.debian.org/doc/debian-policy/ch-controlfields.html
}
