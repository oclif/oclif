import { Command, flags } from '@oclif/command';
import * as Config from '@oclif/config';
export default class Readme extends Command {
    static hidden: boolean;
    static description: string;
    static flags: {
        dir: flags.IOptionFlag<string>;
        multi: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    run(): Promise<void>;
    replaceTag(readme: string, tag: string, body: string): string;
    toc(__: Config.IConfig, readme: string): string;
    usage(config: Config.IConfig): string;
    multiCommands(config: Config.IConfig, commands: Config.Command[], dir: string): string;
    createTopicFile(file: string, config: Config.IConfig, topic: Config.Topic, commands: Config.Command[]): void;
    commands(config: Config.IConfig, commands: Config.Command[]): string;
    renderCommand(config: Config.IConfig, c: Config.Command): string;
    commandCode(config: Config.IConfig, c: Config.Command): string | undefined;
    private repo;
    /**
     * fetches the path to a command
     */
    private commandPath;
    private commandUsage;
}
