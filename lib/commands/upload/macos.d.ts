import { Command, flags } from '@oclif/command';
export default class UploadMacos extends Command {
    static hidden: boolean;
    static description: string;
    static flags: {
        root: flags.IOptionFlag<string>;
    };
    run(): Promise<void>;
}
