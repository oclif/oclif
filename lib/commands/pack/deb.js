"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const _ = require("lodash");
const qq = require("qqjs");
const Tarballs = require("../../tarballs");
const upload_util_1 = require("../../upload-util");
const scripts = {
    /* eslint-disable no-useless-escape */
    bin: (config) => `#!/usr/bin/env bash
set -e
echoerr() { echo "$@" 1>&2; }
get_script_dir () {
  SOURCE="\${BASH_SOURCE[0]}"
  # While \$SOURCE is a symlink, resolve it
  while [ -h "\$SOURCE" ]; do
    DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
    SOURCE="\$( readlink "\$SOURCE" )"
    # If \$SOURCE was a relative symlink (so no "/" as prefix, need to resolve it relative to the symlink base directory
    [[ \$SOURCE != /* ]] && SOURCE="\$DIR/\$SOURCE"
  done
  DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
  echo "\$DIR"
}
DIR=\$(get_script_dir)
export ${config.scopedEnvVarKey('UPDATE_INSTRUCTIONS')}="update with \\"sudo apt update && sudo apt install ${config.bin}\\""
\$DIR/node \$DIR/run "\$@"
`,
    /* eslint-enable no-useless-escape */
    control: (config, arch) => `Package: ${config.config.bin}
Version: ${upload_util_1.debVersion(config)}
Section: main
Priority: standard
Architecture: ${arch}
Maintainer: ${config.config.scopedEnvVar('AUTHOR') || config.config.pjson.author}
Description: ${config.config.pjson.description}
`,
    ftparchive: (config) => `
APT::FTPArchive::Release {
  Origin "${config.scopedEnvVar('AUTHOR') || config.pjson.author}";
  Suite  "stable";
`,
};
class PackDeb extends command_1.Command {
    async run() {
        if (process.platform !== 'linux')
            throw new Error('debian packing must be run on linux');
        const { flags } = this.parse(PackDeb);
        const buildConfig = await Tarballs.buildConfig(flags.root);
        const { config } = buildConfig;
        await Tarballs.build(buildConfig, { platform: 'linux', pack: false });
        const dist = buildConfig.dist('deb');
        await qq.emptyDir(dist);
        const build = async (arch) => {
            const target = { platform: 'linux', arch };
            const versionedDebBase = upload_util_1.templateShortKey('deb', { bin: config.bin, versionShaRevision: upload_util_1.debVersion(buildConfig), arch: upload_util_1.debArch(arch) });
            const workspace = qq.join(buildConfig.tmp, 'apt', versionedDebBase.replace('.deb', '.apt'));
            await qq.rm(workspace);
            await qq.mkdirp([workspace, 'DEBIAN']);
            await qq.mkdirp([workspace, 'usr/bin']);
            await qq.mkdirp([workspace, 'usr/lib']);
            await qq.mv(buildConfig.workspace(target), [workspace, 'usr/lib', config.dirname]);
            await qq.write([workspace, 'usr/lib', config.dirname, 'bin', config.bin], scripts.bin(config));
            await qq.write([workspace, 'DEBIAN/control'], scripts.control(buildConfig, upload_util_1.debArch(arch)));
            await qq.chmod([workspace, 'usr/lib', config.dirname, 'bin', config.bin], 0o755);
            await qq.x(`ln -s "../lib/${config.dirname}/bin/${config.bin}" "${workspace}/usr/bin/${config.bin}"`);
            await qq.x(`chown -R root "${workspace}"`);
            await qq.x(`chgrp -R root "${workspace}"`);
            await qq.x(`dpkg --build "${workspace}" "${qq.join(dist, versionedDebBase)}"`);
        };
        const arches = _.uniq(buildConfig.targets
            .filter(t => t.platform === 'linux')
            .map(t => t.arch));
        // eslint-disable-next-line no-await-in-loop
        for (const a of arches)
            await build(a);
        await qq.x('apt-ftparchive packages . > Packages', { cwd: dist });
        await qq.x('gzip -c Packages > Packages.gz', { cwd: dist });
        await qq.x('bzip2 -k Packages', { cwd: dist });
        await qq.x('xz -k Packages', { cwd: dist });
        const ftparchive = qq.join(buildConfig.tmp, 'apt', 'apt-ftparchive.conf');
        await qq.write(ftparchive, scripts.ftparchive(config));
        await qq.x(`apt-ftparchive -c "${ftparchive}" release . > Release`, { cwd: dist });
        const gpgKey = config.scopedEnvVar('DEB_KEY');
        if (gpgKey) {
            await qq.x(`gpg --digest-algo SHA512 --clearsign -u ${gpgKey} -o InRelease Release`, { cwd: dist });
            await qq.x(`gpg --digest-algo SHA512 -abs -u ${gpgKey} -o Release.gpg Release`, { cwd: dist });
        }
    }
}
exports.default = PackDeb;
PackDeb.hidden = true;
PackDeb.description = 'pack CLI into debian package';
PackDeb.flags = {
    root: command_1.flags.string({ char: 'r', description: 'path to oclif CLI root', default: '.', required: true }),
};
