import {flags} from '@oclif/command'

import Base from '../command-base'

export interface Options {
  name: string
  defaults?: boolean
  force?: boolean
}

export default abstract class AppCommand extends Base {
  static description = 'add a command to an existing CLI or plugin'

  static flags = {
    defaults: flags.boolean({description: 'use defaults for every setting'}),
    force: flags.boolean({description: 'overwrite existing files'}),
  }
  static args = [
    {name: 'name', description: 'name of command', required: true}
  ]

  async run() {
    const {flags, args} = this.parse(AppCommand)
    await super.generate('command', {
      name: args.name,
      defaults: flags.defaults,
      force: flags.force
    } as Options)
  }
}
