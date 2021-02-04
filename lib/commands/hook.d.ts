import { flags } from '@oclif/command';
import Base from '../command-base';
export interface Options {
    name: string;
    defaults?: boolean;
    force?: boolean;
    event: string;
}
export default abstract class HookCommand extends Base {
    static description: string;
    static flags: {
        defaults: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        force: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        event: flags.IOptionFlag<string>;
    };
    static args: {
        name: string;
        description: string;
        required: boolean;
    }[];
    run(): Promise<void>;
}
