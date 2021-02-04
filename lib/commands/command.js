"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const command_base_1 = require("../command-base");
class AppCommand extends command_base_1.default {
    async run() {
        const { flags, args } = this.parse(AppCommand);
        await super.generate('command', {
            name: args.name,
            defaults: flags.defaults,
            force: flags.force,
        });
    }
}
exports.default = AppCommand;
AppCommand.description = 'add a command to an existing CLI or plugin';
AppCommand.flags = {
    defaults: command_1.flags.boolean({ description: 'use defaults for every setting' }),
    force: command_1.flags.boolean({ description: 'overwrite existing files' }),
};
AppCommand.args = [
    { name: 'name', description: 'name of command', required: true },
];
