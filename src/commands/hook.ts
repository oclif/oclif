import {flags} from '@oclif/command'

import Base from '../command_base'

export interface Options {
  name: string
  defaults?: boolean
  force?: boolean
  event: string
}

export default abstract class HookCommand extends Base {
  static description = 'add a hook to an existing CLI or plugin'

  static flags = {
    defaults: flags.boolean({description: 'use defaults for every setting'}),
    force: flags.boolean({description: 'overwrite existing files'}),
    event: flags.string({description: 'event to run hook on', default: 'init'}),
  }
  static args = [
    {name: 'name', description: 'name of hook (snake_case)', required: true}
  ]

  async run() {
    const {flags, args} = this.parse(HookCommand)
    await super.generate('hook', {
      name: args.name,
      event: flags.event,
      defaults: flags.defaults,
      force: flags.force,
    } as Options)
  }
}
