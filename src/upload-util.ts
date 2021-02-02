import {PJSON, IConfig} from '@oclif/config'
import * as Lodash from 'lodash'
import * as path from 'path'

import {BuildConfig as TarballConfig} from './tarballs/config'

// export function commitSHA(cwd: string): string {
//   const child_process = require('child_process')
//   const sha = child_process.execSync(`git -C ${cwd} rev-parse --short HEAD`).toString().trim()
//   return sha
// }
// const s3VersionObjKey = (object: string, opts: {debian?: boolean} = {}): string => {
//   const apt = opts.debian ? 'apt/' : ''
//   return `versions/${flags.version}/${flags.sha}/${apt}${object}`
// }
// const s3ManifestChannelKey = (object: string, opts: {debian?: boolean } = {}): string => {
//   const apt = opts.debian ? 'apt/' : ''
//   return `channel/${flags.channel}/${apt}${object}`
// }

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
export function templateShortKey(type: keyof PJSON.S3.Templates | 'macos' | 'win32' | 'deb', ext?: '.tar.gz' | '.tar.xz' | IConfig.s3Key.Options, options: IConfig.s3Key.Options = {root: '.'}) {
  if (typeof ext === 'object') options = Object.assign(options, ext)
  else if (ext) options.ext = ext
  const _: typeof Lodash = require('lodash')
  const templates = {
    baseDir: '<%- bin %>',
    unversioned: '<%- bin %>-<%- platform %>-<%- arch %><%- ext %>',
    versioned: '<%- bin %>-v<%- version %>-<%- sha %>-<%- platform %>-<%- arch %><%- ext %>',
    manifest: '<%- bin %>-v<%- version %>-<%- sha %>-<%- platform %>-<%- arch %>-buildmanifest',
    macos: '<%- bin %>-v<%- version %>-<%- sha %>.pkg',
    win32: '<%- bin %>-v<%- version %>-<%- sha %>-<%- arch %>.exe',
    deb: '<%- bin %>_<%- version %>_<%- arch %>.deb',
  }
  return _.template(templates[type])({...options})
}
