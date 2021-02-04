import { flags } from '@oclif/command';
import Base from './command-base';
export default abstract class AppCommand extends Base {
    static flags: {
        defaults: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        options: flags.IOptionFlag<string | undefined>;
        force: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static args: {
        name: string;
        required: boolean;
        description: string;
    }[];
    abstract type: string;
    run(): Promise<void>;
}
