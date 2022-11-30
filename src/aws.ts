import * as CloudFront from 'aws-sdk/clients/cloudfront'
import * as S3 from 'aws-sdk/clients/s3'
import * as fs from 'fs-extra'

import {debug as Debug, log} from './log'
import {prettifyPaths} from './util'

const debug = Debug.new('aws')

export namespace upload {
  export interface Options {
    localFile: string;
    s3Params: {
      Bucket: string;
      Key: string;
    };
  }
}

const cache: {s3?: S3; cloudfront?: CloudFront} = {}
const aws = {
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
      cache.s3 = cache.s3 || new (require('aws-sdk/clients/s3') as typeof S3)({
        ...this.creds,
        endpoint: process.env.AWS_S3_ENDPOINT,
        s3ForcePathStyle: Boolean(process.env.AWS_S3_FORCE_PATH_STYLE),
      })
      return cache.s3
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') throw new Error(`${error.message}\naws-sdk is needed to run this command.\nInstall aws-sdk as a devDependency in your CLI. \`yarn add -D aws-sdk\``)
      throw error
    }
  },
  get cloudfront() {
    cache.cloudfront = cache.cloudfront || new (require('aws-sdk/clients/cloudfront') as typeof CloudFront)(this.creds)
    return cache.cloudfront
  },
}

export default {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  get cloudfront() {
    return {
      createCloudfrontInvalidation: (options: CloudFront.Types.CreateInvalidationRequest) => new Promise((resolve, reject) => {
        log('createCloudfrontInvalidation', options.DistributionId, options.InvalidationBatch.Paths.Items)
        aws.cloudfront.createInvalidation(options, err => {
          if (err) reject(err)
          else resolve(null)
        })
      }),
    }
  },
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  get s3() {
    return {
      uploadFile: (local: string, options: S3.Types.PutObjectRequest) => new Promise((resolve, reject) => {
        log('s3:uploadFile', prettifyPaths(local), `s3://${options.Bucket}/${options.Key}`)
        options.Body = fs.createReadStream(local)
        aws.s3.upload(options, err => {
          if (err) reject(err)
          else resolve(null)
        })
      }),
      headObject: (options: S3.Types.HeadObjectRequest) => new Promise<S3.HeadObjectOutput>((resolve, reject) => {
        debug('s3:headObject', `s3://${options.Bucket}/${options.Key}`)
        aws.s3.headObject(options, (err, data) => {
          if (err) reject(err)
          else resolve(data)
        })
      }),
      copyObject: (options: S3.Types.CopyObjectRequest) => new Promise((resolve, reject) => {
        log('s3:copyObject', `from s3://${options.CopySource}`, `to s3://${options.Bucket}/${options.Key}`)
        aws.s3.copyObject(options, function (err, data) {
          if (err) reject(err)
          else resolve(data)
        })
      }),
      getObject: (options: S3.Types.GetObjectRequest) => new Promise<S3.GetObjectOutput>((resolve, reject) => {
        debug('getObject', `s3://${options.Bucket}/${options.Key}`)
        aws.s3.getObject(options, function (err, data) {
          if (err) reject(err)
          else resolve(data)
        })
      }),
      listObjects: (options: S3.Types.ListObjectsV2Request) => new Promise<S3.ListObjectsV2Output>((resolve, reject) => {
        debug('listObjects', `s3://${options.Bucket}/${options.Prefix}`)
        aws.s3.listObjectsV2(options, (err, objects) => {
          if (err) reject(err)
          resolve(objects)
        })
      }),
      deleteObjects: (options: S3.Types.DeleteObjectsRequest) => new Promise<S3.DeleteObjectsOutput>((resolve, reject) => {
        debug('deleteObjects', `s3://${options.Bucket}`)
        aws.s3.deleteObjects(options, (err, deletedObjects) => {
          if (err) reject(err)
          resolve(deletedObjects)
        })
      }),
    }
  },
}
// export const getObject = (options: S3.Types.GetObjectRequest) => new Promise<S3.GetObjectOutput>((resolve, reject) => {
//   debug('getObject', `s3://${options.Bucket}/${options.Key}`)
//   aws.s3().getObject(options, (err, data) => {
//     if (err) reject(err)
//     else resolve(data)
//   })
// })

// export const listObjects = (options: S3.Types.ListObjectsV2Request) => new Promise<S3.ListObjectsV2Output>((resolve, reject) => {
//   debug('listObjects', `s3://${options.Bucket}/${options.Prefix}`)
//   s3().listObjectsV2(options, (err, objects) => {
//     if (err) reject(err)
//     else resolve(objects)
//   })
// })
