"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const qq = require("qqjs");
const log_1 = require("./log");
const debug = log_1.debug.new('aws');
const cache = {};
const aws = {
    get creds() {
        const creds = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
        };
        if (!creds.accessKeyId)
            throw new Error('AWS_ACCESS_KEY_ID not set');
        if (!creds.secretAccessKey)
            throw new Error('AWS_SECRET_ACCESS_KEY not set');
        return creds;
    },
    get s3() {
        try {
            cache.s3 = cache.s3 || new (require('aws-sdk/clients/s3'))(Object.assign(Object.assign({}, this.creds), { endpoint: process.env.AWS_S3_ENDPOINT, s3ForcePathStyle: Boolean(process.env.AWS_S3_FORCE_PATH_STYLE) }));
            return cache.s3;
        }
        catch (error) {
            if (error.code === 'MODULE_NOT_FOUND')
                throw new Error(`${error.message}\naws-sdk is needed to run this command.\nInstall aws-sdk as a devDependency in your CLI. \`yarn add -D aws-sdk\``);
            throw error;
        }
    },
    get cloudfront() {
        cache.cloudfront = cache.cloudfront || new (require('aws-sdk/clients/cloudfront'))(this.creds);
        return cache.cloudfront;
    },
};
exports.default = {
    get cloudfront() {
        return {
            createCloudfrontInvalidation: (options) => new Promise((resolve, reject) => {
                log_1.log('createCloudfrontInvalidation', options.DistributionId, options.InvalidationBatch.Paths.Items);
                aws.cloudfront.createInvalidation(options, err => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            }),
        };
    },
    get s3() {
        return {
            uploadFile: (local, options) => new Promise((resolve, reject) => {
                log_1.log('s3:uploadFile', qq.prettifyPaths(local), `s3://${options.Bucket}/${options.Key}`);
                options.Body = fs.createReadStream(local);
                aws.s3.upload(options, err => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            }),
            headObject: (options) => new Promise((resolve, reject) => {
                debug('s3:headObject', `s3://${options.Bucket}/${options.Key}`);
                aws.s3.headObject(options, (err, data) => {
                    if (err)
                        reject(err);
                    else
                        resolve(data);
                });
            }),
            copyObject: (options) => new Promise((resolve, reject) => {
                log_1.log('s3:copyObject', `from s3://${options.CopySource}`, `to s3://${options.Bucket}/${options.Key}`);
                aws.s3.copyObject(options, function (err, data) {
                    if (err)
                        reject(err);
                    else
                        resolve(data);
                });
            }),
        };
    },
};
// export const getObject = (options: S3.Types.GetObjectRequest) => new Promise<S3.GetObjectOutput>((resolve, reject) => {
//   debug('getObject', `s3://${options.Bucket}/${options.Key}`)
//   s3().getObject(options, (err, data) => {
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
