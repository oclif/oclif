"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const command_base_1 = require("./command-base");
class AppCommand extends command_base_1.default {
    async run() {
        const { flags, args } = this.parse(AppCommand);
        const options = flags.options ? flags.options.split(',') : [];
        await super.generate('app', {
            type: this.type,
            path: args.path,
            options,
            defaults: flags.defaults,
            force: flags.force,
        });
    }
}
exports.default = AppCommand;
AppCommand.flags = {
    defaults: command_1.flags.boolean({ description: 'use defaults for every setting' }),
    options: command_1.flags.string({ description: '(yarn|typescript|eslint|mocha)' }),
    force: command_1.flags.boolean({ description: 'overwrite existing files' }),
};
AppCommand.args = [
    { name: 'path', required: false, description: 'path to project, defaults to current directory' },
];
