import { Command, flags } from '@oclif/command';
export default class UploadTarballs extends Command {
    static hidden: boolean;
    static description: string;
    static flags: {
        root: flags.IOptionFlag<string>;
        targets: flags.IOptionFlag<string>;
    };
    run(): Promise<void>;
}
