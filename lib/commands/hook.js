"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const command_base_1 = require("../command-base");
class HookCommand extends command_base_1.default {
    async run() {
        const { flags, args } = this.parse(HookCommand);
        await super.generate('hook', {
            name: args.name,
            event: flags.event,
            defaults: flags.defaults,
            force: flags.force,
        });
    }
}
exports.default = HookCommand;
HookCommand.description = 'add a hook to an existing CLI or plugin';
HookCommand.flags = {
    defaults: command_1.flags.boolean({ description: 'use defaults for every setting' }),
    force: command_1.flags.boolean({ description: 'overwrite existing files' }),
    event: command_1.flags.string({ description: 'event to run hook on', default: 'init' }),
};
HookCommand.args = [
    { name: 'name', description: 'name of hook (snake_case)', required: true },
];
