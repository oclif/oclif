export function commitSHA(cwd: string): string {
  const child_process = require('child_process')
  const sha = child_process.execSync(`git -C ${cwd} rev-parse --short HEAD`).toString().trim()
  return sha
}

export function commitAWSDir(version: string, cwd: string): string {
  return `versions/${version}/${commitSHA(cwd)}/`
}
