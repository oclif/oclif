import CommandBase from './../../command-base'
import {Flags} from '@oclif/core'

export default class GenerateCommand extends CommandBase {
  static description = 'add a command to an existing CLI or plugin'

  static flags = {
    force: Flags.boolean({description: 'overwrite existing files'}),
  }

  static args = [
    {name: 'name', description: 'name of command', required: true},
  ]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(GenerateCommand)

    super.generate('command', {
      name: args.name,
      force: flags.force,
    })
  }
}
