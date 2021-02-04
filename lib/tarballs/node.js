"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("@oclif/errors");
const path = require("path");
const qq = require("qqjs");
const log_1 = require("../log");
async function checkFor7Zip() {
    try {
        await qq.x('7z', { stdio: [0, null, 2] });
    }
    catch (error) {
        if (error.code === 127)
            errors_1.error('install 7-zip to package windows tarball');
        else
            throw error;
    }
}
async function fetchNodeBinary({ nodeVersion, output, platform, arch, tmp }) {
    if (arch === 'arm')
        arch = 'armv7l';
    let nodeBase = `node-v${nodeVersion}-${platform}-${arch}`;
    let tarball = path.join(tmp, 'node', `${nodeBase}.tar.xz`);
    let url = `https://nodejs.org/dist/v${nodeVersion}/${nodeBase}.tar.xz`;
    if (platform === 'win32') {
        await checkFor7Zip();
        // eslint-disable-next-line require-atomic-updates
        nodeBase = `node-v${nodeVersion}-win-${arch}`;
        tarball = path.join(tmp, 'node', `${nodeBase}.7z`);
        url = `https://nodejs.org/dist/v${nodeVersion}/${nodeBase}.7z`;
        output += '.exe';
    }
    let cache = path.join(tmp, 'cache', `node-v${nodeVersion}-${platform}-${arch}`);
    if (platform === 'win32')
        cache += '.exe';
    const download = async () => {
        log_1.log(`downloading ${nodeBase}`);
        const shasums = path.join(tmp, 'cache', nodeVersion, 'SHASUMS256.txt.asc');
        if (!await qq.exists(shasums)) {
            await qq.download(`https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt.asc`, shasums);
        }
        const basedir = path.dirname(tarball);
        await qq.mkdirp(basedir);
        await qq.download(url, tarball);
        await qq.x(`grep ${path.basename(tarball)} ${shasums} | shasum -a 256 -c -`, { cwd: basedir });
    };
    const extract = async () => {
        log_1.log(`extracting ${nodeBase}`);
        const nodeTmp = path.join(tmp, 'node');
        await qq.rm([nodeTmp, nodeBase]);
        await qq.mkdirp(nodeTmp);
        await qq.mkdirp(path.dirname(cache));
        if (platform === 'win32') {
            qq.pushd(nodeTmp);
            await qq.x(`7z x -bd -y ${tarball} > /dev/null`);
            await qq.mv([nodeBase, 'node.exe'], cache);
            qq.popd();
        }
        else {
            await qq.x(`tar -C ${tmp}/node -xJf ${tarball}`);
            await qq.mv([nodeTmp, nodeBase, 'bin/node'], cache);
        }
    };
    if (await qq.exists(cache)) {
        await qq.cp(cache, output);
    }
    else {
        await download();
        await extract();
        await qq.cp(cache, output);
    }
    return output;
}
exports.fetchNodeBinary = fetchNodeBinary;
