import { Command, flags } from '@oclif/command';
export default class Promote extends Command {
    static hidden: boolean;
    static description: string;
    static flags: {
        root: flags.IOptionFlag<string>;
        version: flags.IOptionFlag<string>;
        sha: flags.IOptionFlag<string>;
        channel: flags.IOptionFlag<string>;
        targets: flags.IOptionFlag<string>;
        deb: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        macos: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        win: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        'max-age': flags.IOptionFlag<string>;
        xz: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
