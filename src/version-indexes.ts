import {ObjectCannedACL} from '@aws-sdk/client-s3'
import * as fs from 'fs-extra'
import path from 'node:path'

import aws from './aws'
import {debug as Debug} from './log'
import {BuildConfig} from './tarballs'

const debug = Debug.new('version-indexes')

interface VersionsObject {
  [key: string]: string
}

const sortVersionsObjectByKeysDesc = (input: VersionsObject, keyLimit?: number): VersionsObject => {
  const keys = (
    Reflect.ownKeys(input).sort((a, b) => {
      const splitA = (a as string).split('.').map((part) => Number.parseInt(part, 10))
      const splitB = (b as string).split('.').map((part) => Number.parseInt(part, 10))
      // sort by major
      if (splitA[0] < splitB[0]) return 1
      if (splitA[0] > splitB[0]) return -1
      // sort by minor
      if (splitA[1] < splitB[1]) return 1
      if (splitA[1] > splitB[1]) return -1
      // sort by patch
      if (splitA[2] < splitB[2]) return 1
      if (splitA[2] > splitB[2]) return -1
      return 0
    }) as string[]
  ).slice(0, keyLimit) // undefined keyLimit returns the entire array
  const result: VersionsObject = {}
  for (const key of keys) {
    result[key] = input[key]
  }

  return result
}

// appends to an existing file (or writes a new one) with the versions in descending order, with an optional limit from the pjson file
export const appendToIndex = async (input: {
  dryRun?: boolean
  filename: string
  maxAge: string
  originalUrl: string
  s3Config: BuildConfig['s3Config']
  version: string
}): Promise<void> => {
  const {filename, maxAge, originalUrl, s3Config, version} = input
  // these checks are both nice for users AND helpful for TS
  if (!s3Config.bucket) throw new Error('[package.json].oclif.s3.bucket is required for indexes')
  if (!s3Config.host) throw new Error('[package.json].oclif.s3.host is required for indexes')

  // json-friendly filenames like sfdx-linux-x64-tar-gz
  const jsonFileName = `${filename.replaceAll('.', '-')}.json`
  // folder is optional, but honored if present
  const key = path.posix.join(s3Config.folder ?? '', 'versions', jsonFileName)

  // retrieve existing index file
  let existing = {}
  try {
    const {Body} = await aws.s3.getObject({
      Bucket: s3Config.bucket,
      Key: key,
    })
    // @ts-expect-error because StreamingBlobTypes doesn't have transformToString
    // but it's expected to be there according to the docs
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-smithy-types/TypeAlias/StreamingBlobPayloadOutputTypes/
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-smithy-types/Interface/SdkStreamMixin/
    existing = JSON.parse(await Body?.transformToString())
    debug('appending to existing index file')
  } catch (error: unknown) {
    debug(`error on ${key}`, error)
  }

  // appends new version from this promotion if not already present (idempotent)
  await fs.writeJSON(
    jsonFileName,
    sortVersionsObjectByKeysDesc(
      {
        ...existing,
        [version]: originalUrl.replace(s3Config.bucket, s3Config.host),
      },
      s3Config.indexVersionLimit,
    ),
    {spaces: 2},
  )

  // put the file back in the same place
  await aws.s3.uploadFile(
    jsonFileName,
    {
      ACL: s3Config.acl ?? ObjectCannedACL.public_read,
      Bucket: s3Config.bucket,
      CacheControl: maxAge,
      Key: key,
    },
    {
      dryRun: input.dryRun,
    },
  )
  // cleans up local fs
  await fs.remove(jsonFileName)
}
