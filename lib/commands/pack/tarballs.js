"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const qq = require("qqjs");
const Tarballs = require("../../tarballs");
class PackTarballs extends command_1.Command {
    async run() {
        const prevCwd = qq.cwd();
        if (process.platform === 'win32')
            throw new Error('pack does not function on windows');
        const { flags } = this.parse(PackTarballs);
        const targets = flags.targets.split(',');
        const buildConfig = await Tarballs.buildConfig(flags.root, { xz: flags.xz, targets: targets });
        await Tarballs.build(buildConfig);
        qq.cd(prevCwd);
    }
}
exports.default = PackTarballs;
PackTarballs.hidden = true;
PackTarballs.description = `packages oclif CLI into tarballs

This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
`;
PackTarballs.flags = {
    root: command_1.flags.string({ char: 'r', description: 'path to oclif CLI root', default: '.', required: true }),
    targets: command_1.flags.string({ char: 't',
        description: 'comma-separated targets to pack (e.g.: linux-arm,win32-x64)',
        default: Tarballs.TARGETS.join(','),
    }),
    xz: command_1.flags.boolean({ description: 'also build xz', allowNo: true, default: true }),
};
