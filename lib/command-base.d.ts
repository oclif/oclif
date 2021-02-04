import Command from '@oclif/command';
export default abstract class CommandBase extends Command {
    protected generate(type: string, generatorOptions?: object): Promise<void>;
}
