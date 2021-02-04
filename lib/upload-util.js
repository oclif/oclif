"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function commitAWSDir(version, sha, s3Config) {
    let s3SubDir = s3Config.folder || '';
    if (s3SubDir !== '' && s3SubDir.slice(-1) !== '/')
        s3SubDir = `${s3SubDir}/`;
    return path.join(s3SubDir, 'versions', version, sha);
}
exports.commitAWSDir = commitAWSDir;
function channelAWSDir(channel, s3Config) {
    let s3SubDir = s3Config.folder || '';
    if (s3SubDir !== '' && s3SubDir.slice(-1) !== '/')
        s3SubDir = `${s3SubDir}/`;
    return path.join(s3SubDir, 'channels', channel);
}
exports.channelAWSDir = channelAWSDir;
// to-do:
// When this pkg starts using oclif/core
// refactor this key name lookup
// helper to oclif/core
function templateShortKey(type, ext, options = { root: '.' }) {
    if (typeof ext === 'object')
        options = Object.assign(options, ext);
    else if (ext)
        options.ext = ext;
    const _ = require('lodash');
    const templates = {
        baseDir: '<%- bin %>',
        unversioned: '<%- bin %>-<%- platform %>-<%- arch %><%- ext %>',
        versioned: '<%- bin %>-v<%- version %>-<%- sha %>-<%- platform %>-<%- arch %><%- ext %>',
        manifest: '<%- bin %>-v<%- version %>-<%- sha %>-<%- platform %>-<%- arch %>-buildmanifest',
        macos: '<%- bin %>-v<%- version %>-<%- sha %>.pkg',
        win32: '<%- bin %>-v<%- version %>-<%- sha %>-<%- arch %>.exe',
        deb: '<%- bin %>_<%- versionShaRevision %>_<%- arch %>.deb',
    };
    return _.template(templates[type])(Object.assign({}, options));
}
exports.templateShortKey = templateShortKey;
function debArch(arch) {
    if (arch === 'x64')
        return 'amd64';
    if (arch === 'x86')
        return 'i386';
    if (arch === 'arm')
        return 'armel';
    throw new Error(`invalid arch: ${arch}`);
}
exports.debArch = debArch;
function debVersion(buildConfig) {
    return `${buildConfig.version.split('-')[0]}.${buildConfig.gitSha}-1`;
    // see debian_revision: https://www.debian.org/doc/debian-policy/ch-controlfields.html
}
exports.debVersion = debVersion;
