import {Args, Flags} from '@oclif/core'

import CommandBase from './../../command-base'

export default class GenerateCommand extends CommandBase {
  static args = {
    name: Args.string({description: 'name of command', required: true}),
  }

  static description = 'add a command to an existing CLI or plugin'

  static flags = {
    force: Flags.boolean({description: 'overwrite existing files'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(GenerateCommand)

    await super.generate('command', {
      force: flags.force,
      name: args.name,
    })
  }
}
