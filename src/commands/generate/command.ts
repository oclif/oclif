import {Args, Command, Flags} from '@oclif/core'
import {generate} from '../../util'

export default class GenerateCommand extends Command {
  static description = 'add a command to an existing CLI or plugin'

  static flags = {
    force: Flags.boolean({description: 'overwrite existing files'}),
  }

  static args = {
    name: Args.string({description: 'name of command', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(GenerateCommand)

    await generate('command', {
      name: args.name,
      force: flags.force,
    })
  }
}
