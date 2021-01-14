import {PJSON, IConfig} from '@oclif/config'
import * as Lodash from 'lodash'

export function commitSHA(cwd: string): string {
  const child_process = require('child_process')
  const sha = child_process.execSync(`git -C ${cwd} rev-parse --short HEAD`).toString().trim()
  return sha
}

export function commitAWSDir(version: string, cwd: string): string {
  return `versions/${version}/${commitSHA(cwd)}`
}

// to-do:
// When this pkg starts using oclif/core
// refactor this key name lookup
// helper to oclif/core
export function s3Key(type: keyof PJSON.S3.Templates, ext?: '.tar.gz' | '.tar.xz' | IConfig.s3Key.Options, options: IConfig.s3Key.Options = {}) {
  if (typeof ext === 'object') options = ext
  else if (ext) options.ext = ext
  const _: typeof Lodash = require('lodash')
  const s3Root = commitAWSDir(options.version, options.root)
  const templates = {
    baseDir: '<%- bin %>',
    unversioned: '<%- bin %>-<%- platform %>-<%- arch %><%- ext %>',
    versioned: '<%- bin %>-v<%- version %>-<%- platform %>-<%- arch %><%- ext %>',
    manifest: '<%- platform %>-<%- arch %>-buildmanifest',
  }
  return _.template(templates[type])({...options, root: s3Root})
}
