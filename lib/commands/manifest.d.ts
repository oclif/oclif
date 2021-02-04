import { Command } from '@oclif/command';
export default class Manifest extends Command {
    static hidden: boolean;
    static description: string;
    static args: {
        name: string;
        description: string;
        default: string;
    }[];
    run(): Promise<void>;
}
