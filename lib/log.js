"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_ux_1 = require("cli-ux");
const qq = require("qqjs");
const util = require("util");
exports.debug = require('debug')('oclif-dev');
exports.debug.new = (name) => require('debug')(`oclif-dev:${name}`);
function log(format, ...args) {
    args = args.map(qq.prettifyPaths);
    exports.debug.enabled ? exports.debug(format, ...args) : cli_ux_1.default.log(`oclif-dev: ${util.format(format, ...args)}`);
}
exports.log = log;
