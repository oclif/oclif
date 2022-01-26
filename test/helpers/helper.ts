import * as qq from 'qqjs'
import {expect} from '@oclif/test'
import {gitSha} from '../../src/tarballs'
import * as shelljs from 'shelljs'

export const oclifTestingVersionsURI = 'dfc-data-production/media/salesforce-cli/oclif-testing/versions'
export const oclifTestingChannelsURI = 'dfc-data-production/media/salesforce-cli/oclif-testing/channels'
export const devSalesforceoclifTestingVersionsURI = 'developer.salesforce.com/media/salesforce-cli/oclif-testing/versions'

export const findDistFileSha = async (cwd: string, filter: (f: string) => boolean): Promise<string[]> => {
  const distFiles = await qq.ls(`${cwd}/dist/macos/`)
  const pkg = distFiles.find(element => filter(element)) as string
  expect(pkg).to.be.ok
  return [pkg, await gitSha(process.cwd(), {short: true})]
}

export function gitShaSync(cwd: string, options: {short?: boolean} = {}): string {
  const args = options.short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
  const r = shelljs.exec(`git ${args.join(' ')}`, {cwd})
  return r.stdout
}

