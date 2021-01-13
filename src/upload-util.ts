import {gitSha} from './tarballs/config'

export function commitAWSDir(version: string, root: string): string {
  return `versions/${version}/${gitSha(root, {short: true})}/`
}
