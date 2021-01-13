export function commitSHA(): string {
  const child_process = require('child_process')
  const sha = child_process.execSync('git rev-parse HEAD').toString().trim().slice(0, 8)
  return sha
}

export function commitAWSDir(version: string): string {
  return `versions/${version}/${commitSHA()}/`
}
