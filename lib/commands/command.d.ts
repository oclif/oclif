import Base from '../command-base';
export interface Options {
    name: string;
    defaults?: boolean;
    force?: boolean;
}
export default abstract class AppCommand extends Base {
    static description: string;
    static flags: {
        defaults: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        force: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static args: {
        name: string;
        description: string;
        required: boolean;
    }[];
    run(): Promise<void>;
}
