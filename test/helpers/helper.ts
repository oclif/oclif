import * as qq from 'qqjs'
import {expect} from '@oclif/test'
import {gitSha} from '../../src/tarballs'
import * as shelljs from 'shelljs'
import * as S3 from 'aws-sdk/clients/s3'
import aws from '../../src/aws'

export const oclifTestingVersionsURI = 'media/salesforce-cli/oclif-testing/versions'
export const oclifTestingChannelsURI = 'media/salesforce-cli/oclif-testing/channels'
export const developerSalesforceCom = 'developer.salesforce.com'

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

export async function deleteFolder(bucket: string, folder: string): Promise<(string | undefined)[]> {
  const foundObjects = await aws.s3.listObjects({Bucket: bucket, Prefix: folder})
  const foundKeys = foundObjects.Contents?.map(o => o.Key)
  if (foundKeys && foundKeys.length > 0) {
    const deleteObjectsRequest: S3.Types.DeleteObjectsRequest = {
      Bucket: bucket,
      Delete: {Objects: foundKeys!.map(k => ({Key: k} as S3.ObjectIdentifier))},
    }
    const deletedObjects = await aws.s3.deleteObjects(deleteObjectsRequest)
    return deletedObjects?.Deleted ? deletedObjects.Deleted.map(o => o.Key) : []
  }

  return []
}

