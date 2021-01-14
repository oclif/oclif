export function commitSHA(cwd: string): string {
  const child_process = require('child_process')
  const sha = child_process.execSync(`git -C ${cwd} rev-parse --short HEAD`).toString().trim()
  return sha
}

export function commitAWSDir(version: string, cwd: string): string {
  return `versions/${version}/${commitSHA(cwd)}`
}

export const s3TarballKey = (options: {
  arch: string;
  bin: string;
  ext: string;
  platform: string;
  root: string;
  version: string;
}): string => {
  const {arch, bin, ext, platform, root, version} = options
  const tarballKeyTemplate = '<%- root %>/<%- bin %>-<%- platform %>-<%- arch %><%- ext %>'
  const s3Root = commitAWSDir(version, root)
  const _ = require('lodash')
  return _.template(tarballKeyTemplate)({arch, bin, ext, platform, root: s3Root})
}
