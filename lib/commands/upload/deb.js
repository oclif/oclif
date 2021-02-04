"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const qq = require("qqjs");
const aws_1 = require("../../aws");
const log_1 = require("../../log");
const Tarballs = require("../../tarballs");
const upload_util_1 = require("../../upload-util");
class UploadDeb extends command_1.Command {
    async run() {
        const { flags } = this.parse(UploadDeb);
        const buildConfig = await Tarballs.buildConfig(flags.root);
        const { s3Config, config } = buildConfig;
        const dist = (f) => buildConfig.dist(qq.join('deb', f));
        const S3Options = {
            Bucket: s3Config.bucket,
            ACL: s3Config.acl || 'public-read',
        };
        if (!await qq.exists(dist('Release')))
            this.error('Cannot find debian artifacts', {
                suggestions: ['Run "oclif-dev pack:deb" before uploading'],
            });
        const cloudKeyBase = upload_util_1.commitAWSDir(config.pjson.version, buildConfig.gitSha, s3Config);
        const upload = (file) => {
            const cloudKey = `${cloudKeyBase}/apt/${file}`;
            return aws_1.default.s3.uploadFile(dist(file), Object.assign(Object.assign({}, S3Options), { CacheControl: 'max-age=86400', Key: cloudKey }));
        };
        const uploadDeb = async (arch) => {
            const deb = upload_util_1.templateShortKey('deb', { bin: config.bin, versionShaRevision: upload_util_1.debVersion(buildConfig), arch: arch });
            if (await qq.exists(dist(deb)))
                await upload(deb);
        };
        await uploadDeb('amd64');
        await uploadDeb('i386');
        await upload('Packages.gz');
        await upload('Packages.xz');
        await upload('Packages.bz2');
        await upload('Release');
        if (await qq.exists(dist('InRelease')))
            await upload('InRelease');
        if (await qq.exists(dist('Release.gpg')))
            await upload('Release.gpg');
        log_1.log(`done uploading deb artifacts for v${config.version}-${buildConfig.gitSha}`);
    }
}
exports.default = UploadDeb;
UploadDeb.hidden = true;
UploadDeb.description = 'upload deb package built with pack:deb';
UploadDeb.flags = {
    root: command_1.flags.string({ char: 'r', description: 'path to oclif CLI root', default: '.', required: true }),
};
