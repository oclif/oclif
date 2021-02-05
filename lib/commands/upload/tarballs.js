"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const qq = require("qqjs");
const aws_1 = require("../../aws");
const log_1 = require("../../log");
const Tarballs = require("../../tarballs");
const upload_util_1 = require("../../upload-util");
class UploadTarballs extends command_1.Command {
    async run() {
        const { flags } = this.parse(UploadTarballs);
        if (process.platform === 'win32')
            throw new Error('upload does not function on windows');
        const targets = flags.targets.split(',');
        const buildConfig = await Tarballs.buildConfig(flags.root, { targets, xz: flags.xz });
        const { s3Config, dist, version, config, xz } = buildConfig;
        // fail early if targets are not built
        for (const target of buildConfig.targets) {
            const tarball = dist(upload_util_1.templateShortKey('versioned', Object.assign({ ext: '.tar.gz', bin: config.bin, version, sha: buildConfig.gitSha }, target)));
            // eslint-disable-next-line no-await-in-loop
            if (!await qq.exists(tarball))
                this.error(`Cannot find a tarball for ${target.platform}-${target.arch}`, {
                    suggestions: [`Run "oclif-dev pack --target ${target.platform}-${target.arch}" before uploading`],
                });
        }
        const S3Options = {
            Bucket: s3Config.bucket,
            ACL: s3Config.acl || 'public-read',
        };
        const uploadTarball = async (options) => {
            const TarballS3Options = Object.assign(Object.assign({}, S3Options), { CacheControl: 'max-age=604800' });
            const releaseTarballs = async (ext) => {
                const localKey = upload_util_1.templateShortKey('versioned', ext, {
                    arch: options === null || options === void 0 ? void 0 : options.arch,
                    bin: config.bin,
                    platform: options === null || options === void 0 ? void 0 : options.platform,
                    sha: buildConfig.gitSha,
                    version,
                });
                const cloudKey = `${upload_util_1.commitAWSDir(version, buildConfig.gitSha, s3Config)}/${localKey}`;
                await aws_1.default.s3.uploadFile(dist(localKey), Object.assign(Object.assign({}, TarballS3Options), { ContentType: 'application/gzip', Key: cloudKey }));
            };
            await releaseTarballs('.tar.gz');
            if (xz)
                await releaseTarballs('.tar.xz');
            const ManifestS3Options = Object.assign(Object.assign({}, S3Options), { CacheControl: 'max-age=86400', ContentType: 'application/json' });
            const manifest = upload_util_1.templateShortKey('manifest', {
                arch: options === null || options === void 0 ? void 0 : options.arch,
                bin: config.bin,
                platform: options === null || options === void 0 ? void 0 : options.platform,
                sha: buildConfig.gitSha,
                version: config.version,
            });
            const cloudKey = `${upload_util_1.commitAWSDir(version, buildConfig.gitSha, s3Config)}/${manifest}`;
            await aws_1.default.s3.uploadFile(dist(manifest), Object.assign(Object.assign({}, ManifestS3Options), { Key: cloudKey }));
        };
        if (targets.length > 0)
            log_1.log('uploading targets');
        // eslint-disable-next-line no-await-in-loop
        for (const target of buildConfig.targets)
            await uploadTarball(target);
        log_1.log(`done uploading tarballs & manifests for v${config.version}-${buildConfig.gitSha}`);
    }
}
exports.default = UploadTarballs;
UploadTarballs.hidden = true;
UploadTarballs.description = `upload an oclif CLI to S3

"aws-sdk" will need to be installed as a devDependency to upload.
`;
UploadTarballs.flags = {
    root: command_1.flags.string({ char: 'r', description: 'path to oclif CLI root', default: '.', required: true }),
    targets: command_1.flags.string({
        char: 't',
        description: 'comma-separated targets to upload (e.g.: linux-arm,win32-x64)',
        default: Tarballs.TARGETS.join(','),
    }),
    xz: command_1.flags.boolean({ description: 'also upload xz', allowNo: true, default: true }),
};
