import CommandBase from './../../command-base'
import {Flags} from '@oclif/core'

export default class GenerateHook extends CommandBase {
  static description = 'add a hook to an existing CLI or plugin'

  static flags = {
    force: Flags.boolean({description: 'overwrite existing files'}),
    event: Flags.string({description: 'event to run hook on', default: 'init'}),
  }

  static args = [
    {name: 'name', description: 'name of hook (snake_case)', required: true},
  ]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(GenerateHook)

    super.generate('hook', {
      name: args.name,
      event: flags.event,
      force: flags.force,
    })
  }
}
