import {Args, Flags} from '@oclif/core'

import CommandBase from './../../command-base'

export default class GenerateHook extends CommandBase {
  static args = {
    name: Args.string({description: 'name of hook (snake_case)', required: true}),
  }

  static description = 'add a hook to an existing CLI or plugin'

  static flags = {
    event: Flags.string({default: 'init', description: 'event to run hook on'}),
    force: Flags.boolean({description: 'overwrite existing files'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(GenerateHook)

    await super.generate('hook', {
      event: flags.event,
      force: flags.force,
      name: args.name,
    })
  }
}
