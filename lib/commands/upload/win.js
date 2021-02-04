"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const qq = require("qqjs");
const aws_1 = require("../../aws");
const log_1 = require("../../log");
const Tarballs = require("../../tarballs");
const upload_util_1 = require("../../upload-util");
class UploadWin extends command_1.Command {
    async run() {
        const { flags } = this.parse(UploadWin);
        const buildConfig = await Tarballs.buildConfig(flags.root);
        const { s3Config, version, config, dist } = buildConfig;
        const S3Options = {
            Bucket: s3Config.bucket,
            ACL: s3Config.acl || 'public-read',
        };
        const archs = buildConfig.targets.filter(t => t.platform === 'win32').map(t => t.arch);
        for (const arch of archs) {
            const templateKey = upload_util_1.templateShortKey('win32', { bin: config.bin, version: buildConfig.version, sha: buildConfig.gitSha, arch });
            const localKey = dist(`win32/${templateKey}`);
            // eslint-disable-next-line no-await-in-loop
            if (!await qq.exists(localKey))
                this.error(`Cannot find Windows exe for ${arch}`, {
                    suggestions: ['Run "oclif-dev pack:win" before uploading'],
                });
        }
        const cloudKeyBase = upload_util_1.commitAWSDir(config.pjson.version, buildConfig.gitSha, s3Config);
        const uploadWin = async (arch) => {
            const templateKey = upload_util_1.templateShortKey('win32', { bin: config.bin, version: buildConfig.version, sha: buildConfig.gitSha, arch });
            const localExe = dist(`win32/${templateKey}`);
            const cloudKey = `${cloudKeyBase}/${templateKey}`;
            if (await qq.exists(localExe))
                await aws_1.default.s3.uploadFile(localExe, Object.assign(Object.assign({}, S3Options), { CacheControl: 'max-age=86400', Key: cloudKey }));
        };
        await uploadWin('x64');
        await uploadWin('x86');
        log_1.log(`done uploading windows executables for v${version}-${buildConfig.gitSha}`);
    }
}
exports.default = UploadWin;
UploadWin.hidden = true;
UploadWin.description = 'upload windows installers built with pack:win';
UploadWin.flags = {
    root: command_1.flags.string({ char: 'r', description: 'path to oclif CLI root', default: '.', required: true }),
};
