"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const qq = require("qqjs");
const aws_1 = require("../../aws");
const log_1 = require("../../log");
const Tarballs = require("../../tarballs");
const upload_util_1 = require("../../upload-util");
class UploadMacos extends command_1.Command {
    async run() {
        const { flags } = this.parse(UploadMacos);
        const buildConfig = await Tarballs.buildConfig(flags.root);
        const { s3Config, version, config, dist } = buildConfig;
        const S3Options = {
            Bucket: s3Config.bucket,
            ACL: s3Config.acl || 'public-read',
        };
        const cloudKeyBase = upload_util_1.commitAWSDir(version, buildConfig.gitSha, s3Config);
        const templateKey = upload_util_1.templateShortKey('macos', { bin: config.bin, version, sha: buildConfig.gitSha });
        const cloudKey = `${cloudKeyBase}/${templateKey}`;
        const localPkg = dist(`macos/${templateKey}`);
        if (await qq.exists(localPkg))
            await aws_1.default.s3.uploadFile(localPkg, Object.assign(Object.assign({}, S3Options), { CacheControl: 'max-age=86400', Key: cloudKey }));
        else
            this.error('Cannot find macOS pkg', {
                suggestions: ['Run "oclif-dev pack:macos" before uploading'],
            });
        log_1.log(`done uploading macos pkg for v${version}-${buildConfig.gitSha}`);
    }
}
exports.default = UploadMacos;
UploadMacos.hidden = true;
UploadMacos.description = 'upload macos installers built with pack:macos';
UploadMacos.flags = {
    root: command_1.flags.string({ char: 'r', description: 'path to oclif CLI root', default: '.', required: true }),
};
