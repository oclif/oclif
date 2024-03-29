import {
  CloudFrontClient,
  CreateInvalidationCommand,
  CreateInvalidationCommandOutput,
  CreateInvalidationRequest,
} from '@aws-sdk/client-cloudfront'
import {
  CopyObjectCommand,
  CopyObjectOutput,
  CopyObjectRequest,
  DeleteObjectsCommand,
  DeleteObjectsOutput,
  DeleteObjectsRequest,
  GetObjectCommand,
  GetObjectOutput,
  GetObjectRequest,
  HeadObjectCommand,
  HeadObjectOutput,
  HeadObjectRequest,
  ListObjectsV2Command,
  ListObjectsV2Output,
  ListObjectsV2Request,
  PutObjectCommand,
  PutObjectOutput,
  PutObjectRequest,
  S3Client,
} from '@aws-sdk/client-s3'
import {createReadStream} from 'fs-extra'

import {debug as Debug, log} from './log'
import {prettifyPaths} from './util'

const debug = Debug.new('aws')

const cache: {cloudfront?: CloudFrontClient; s3?: S3Client} = {}
const aws = {
  get cloudfront() {
    cache.cloudfront =
      cache.cloudfront || new (require('@aws-sdk/client-cloudfront').CloudFrontClient)({credentials: this.creds})
    return cache.cloudfront
  },
  get creds() {
    const creds = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    }
    if (!creds.accessKeyId) throw new Error('AWS_ACCESS_KEY_ID not set')
    if (!creds.secretAccessKey) throw new Error('AWS_SECRET_ACCESS_KEY not set')
    return creds
  },
  get s3() {
    try {
      cache.s3 =
        cache.s3 ??
        new (require('@aws-sdk/client-s3').S3Client)({
          credentials: this.creds,
          endpoint: process.env.AWS_S3_ENDPOINT,
          forcePathStyle: Boolean(process.env.AWS_S3_FORCE_PATH_STYLE),
          region: process.env.AWS_REGION ?? 'us-east-1',
        })
      return cache.s3
    } catch (error: unknown) {
      const {code, message} = error as {code: string; message: string}
      if (code === 'MODULE_NOT_FOUND')
        throw new Error(
          `${message}\n@aws-sdk/client-s3 is needed to run this command.\nInstall @aws-sdk/client-s3 as a devDependency in your CLI. \`yarn add -D @aws-sdk/client-s3\``,
        )
      throw error
    }
  },
}

export default {
  get cloudfront() {
    return {
      createCloudfrontInvalidation: (options: CreateInvalidationRequest) =>
        new Promise<CreateInvalidationCommandOutput>((resolve, reject) => {
          log('createCloudfrontInvalidation', options.DistributionId, options.InvalidationBatch?.Paths?.Items)
          aws.cloudfront
            ?.send(new CreateInvalidationCommand(options))
            .then((data) => resolve(data))
            .catch((error) => reject(error))
        }),
    }
  },

  get s3() {
    return {
      copyObject: (options: CopyObjectRequest) =>
        new Promise<CopyObjectOutput>((resolve, reject) => {
          log('s3:copyObject', `from s3://${options.CopySource}`, `to s3://${options.Bucket}/${options.Key}`)
          aws.s3
            ?.send(new CopyObjectCommand(options))
            .then((data) => resolve(data))
            .catch((error) => reject(error))
        }),
      deleteObjects: (options: DeleteObjectsRequest) =>
        new Promise<DeleteObjectsOutput>((resolve, reject) => {
          debug('deleteObjects', `s3://${options.Bucket}`)
          aws.s3
            ?.send(new DeleteObjectsCommand(options))
            .then((data) => resolve(data))
            .catch((error) => reject(error))
        }),
      getObject: (options: GetObjectRequest) =>
        new Promise<GetObjectOutput>((resolve, reject) => {
          debug('getObject', `s3://${options.Bucket}/${options.Key}`)
          aws.s3
            ?.send(new GetObjectCommand(options))
            .then((data) => resolve(data))
            .catch((error) => reject(error))
        }),
      headObject: (options: HeadObjectRequest) =>
        new Promise<HeadObjectOutput>((resolve, reject) => {
          debug('s3:headObject', `s3://${options.Bucket}/${options.Key}`)
          aws.s3
            ?.send(new HeadObjectCommand(options))
            .then((data) => resolve(data))
            .catch((error) => reject(error))
        }),
      listObjects: (options: ListObjectsV2Request) =>
        new Promise<ListObjectsV2Output>((resolve, reject) => {
          debug('listObjects', `s3://${options.Bucket}/${options.Prefix}`)
          aws.s3
            ?.send(new ListObjectsV2Command(options))
            .then((data) => resolve(data))
            .catch((error) => reject(error))
        }),
      uploadFile: (local: string, options: PutObjectRequest) =>
        new Promise<PutObjectOutput>((resolve, reject) => {
          log('s3:uploadFile', prettifyPaths(local), `s3://${options.Bucket}/${options.Key}`)
          options.Body = createReadStream(local)
          aws.s3
            ?.send(new PutObjectCommand(options))
            .then((data) => resolve(data))
            .catch((error) => reject(error))
        }),
    }
  },
}
