import { HelpBase } from '@oclif/plugin-help';
import { Command } from '@oclif/config';
interface MaybeCompatibleHelp extends HelpBase {
    formatCommand?: (command: Command) => string;
    command?: (command: Command) => string;
}
export declare class HelpCompatibilityWrapper {
    inner: MaybeCompatibleHelp;
    constructor(inner: MaybeCompatibleHelp);
    formatCommand(command: Command): string;
}
export {};
