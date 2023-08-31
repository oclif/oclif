import {Args, Command, Flags} from '@oclif/core'
import {generate} from '../../util'

export default class GenerateHook extends Command {
  static description = 'add a hook to an existing CLI or plugin'

  static flags = {
    force: Flags.boolean({description: 'overwrite existing files'}),
    event: Flags.string({description: 'event to run hook on', default: 'init'}),
  }

  static args = {
    name: Args.string({description: 'name of hook (snake_case)', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(GenerateHook)

    await generate('hook', {
      name: args.name,
      event: flags.event,
      force: flags.force,
    })
  }
}
