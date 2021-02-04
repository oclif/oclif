"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class IncompatibleHelpError extends Error {
    constructor() {
        super(...arguments);
        this.message = 'Please implement `formatCommand` in your custom help class.\nSee https://oclif.io/docs/help_classes for more.';
    }
}
class HelpCompatibilityWrapper {
    constructor(inner) {
        this.inner = inner;
    }
    formatCommand(command) {
        if (this.inner.formatCommand) {
            return this.inner.formatCommand(command);
        }
        if (this.inner.command) {
            return command.description + '\n\n' + this.inner.command(command);
        }
        throw new IncompatibleHelpError();
    }
}
exports.HelpCompatibilityWrapper = HelpCompatibilityWrapper;
