import { Command, flags } from '@oclif/command';
export default class PackTarballs extends Command {
    static hidden: boolean;
    static description: string;
    static flags: {
        root: flags.IOptionFlag<string>;
        targets: flags.IOptionFlag<string>;
        xz: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
