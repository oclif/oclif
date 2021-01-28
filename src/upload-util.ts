import {PJSON, IConfig} from '@oclif/config'
import * as Lodash from 'lodash'

import {IConfig as TarballConfig} from './tarballs/config'

export function commitSHA(cwd: string): string {
  const child_process = require('child_process')
  const sha = child_process.execSync(`git -C ${cwd} rev-parse --short HEAD`).toString().trim()
  return sha
}

export function commitAWSDir(version: string, cwd: string, s3Config: TarballConfig['s3Config']): string {
  let s3SubDir = s3Config.folder || ''
  if (s3SubDir !== '' && s3SubDir.slice(-1) !== '/') s3SubDir = `${s3SubDir}/`
  return `${s3SubDir}versions/${version}/${commitSHA(cwd)}`
}

// to-do:
// When this pkg starts using oclif/core
// refactor this key name lookup
// helper to oclif/core
export function s3ShortKey(type: keyof PJSON.S3.Templates, ext?: '.tar.gz' | '.tar.xz' | IConfig.s3Key.Options, options: IConfig.s3Key.Options = {root: '.'}) {
  if (typeof ext === 'object') options = Object.assign(options, ext)
  else if (ext) options.ext = ext
  const _: typeof Lodash = require('lodash')
  const templates = {
    baseDir: '<%- bin %>',
    unversioned: '<%- bin %>-<%- platform %>-<%- arch %><%- ext %>',
    versioned: '<%- bin %>-v<%- version %>-<%- platform %>-<%- arch %><%- ext %>',
    manifest: '<%- platform %>-<%- arch %>-buildmanifest',
  }
  return _.template(templates[type])({...options})
}
