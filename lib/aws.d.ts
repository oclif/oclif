import * as CloudFront from 'aws-sdk/clients/cloudfront';
import * as S3 from 'aws-sdk/clients/s3';
export declare namespace upload {
    interface Options {
        localFile: string;
        s3Params: {
            Bucket: string;
            Key: string;
        };
    }
}
declare const _default: {
    readonly cloudfront: {
        createCloudfrontInvalidation: (options: CloudFront.CreateInvalidationRequest) => Promise<unknown>;
    };
    readonly s3: {
        uploadFile: (local: string, options: S3.PutObjectRequest) => Promise<unknown>;
        headObject: (options: S3.HeadObjectRequest) => Promise<S3.HeadObjectOutput>;
        copyObject: (options: S3.CopyObjectRequest) => Promise<unknown>;
    };
};
export default _default;
