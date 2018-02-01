import {flags, parse} from '@anycli/command'

import Base from '../command_base'

export interface Options {
  name: string
  defaults?: boolean
  force?: boolean
}

export default abstract class AppCommand extends Base {
  static flags = {
    defaults: flags.boolean({description: 'use defaults for every setting'}),
    force: flags.boolean({description: 'overwrite existing files'}),
  }
  static args = [
    {name: 'name', description: 'name of command', required: true}
  ]
  options = parse(this.argv, AppCommand)

  async run() {
    await super.generate('command', {
      name: this.options.args.name,
      defaults: this.options.flags.defaults,
      force: this.options.flags.force
    })
  }
}
