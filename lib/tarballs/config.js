"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Config = require("@oclif/config");
const path = require("path");
const qq = require("qqjs");
const util_1 = require("../util");
const upload_util_1 = require("../upload-util");
exports.TARGETS = [
    'linux-x64',
    'linux-arm',
    'win32-x64',
    'win32-x86',
    'darwin-x64',
];
function gitSha(cwd, options = {}) {
    const args = options.short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD'];
    return qq.x.stdout('git', args, { cwd });
}
exports.gitSha = gitSha;
async function Tmp(config) {
    const tmp = path.join(config.root, 'tmp');
    await qq.mkdirp(tmp);
    return tmp;
}
async function buildConfig(root, options = {}) {
    const config = await Config.load({ root: path.resolve(root), devPlugins: false, userPlugins: false });
    root = config.root;
    const _gitSha = await gitSha(root, { short: true });
    const version = config.version.includes('-') ? `${config.version}.${_gitSha}` : config.version;
    // eslint-disable-next-line new-cap
    const tmp = await Tmp(config);
    const updateConfig = config.pjson.oclif.update || {};
    updateConfig.s3 = updateConfig.s3 || {};
    return {
        root,
        gitSha: _gitSha,
        config,
        tmp,
        updateConfig,
        version,
        xz: typeof options.xz === 'boolean' ? options.xz : Boolean(updateConfig.s3.xz),
        dist: (...args) => path.join(config.root, 'dist', ...args),
        s3Config: updateConfig.s3,
        nodeVersion: updateConfig.node.version || process.versions.node,
        workspace(target) {
            const base = qq.join(config.root, 'tmp');
            if (target && target.platform)
                return qq.join(base, [target.platform, target.arch].join('-'), upload_util_1.templateShortKey('baseDir', { bin: config.bin }));
            return qq.join(base, upload_util_1.templateShortKey('baseDir', { bin: config.bin }));
        },
        targets: util_1.compact(options.targets || updateConfig.node.targets || exports.TARGETS).map(t => {
            const [platform, arch] = t.split('-');
            return { platform, arch };
        }),
    };
}
exports.buildConfig = buildConfig;
