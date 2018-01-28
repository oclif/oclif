import {flags} from '@dxcli/command'

import Base from '../command_base'

export interface Options {
  name: string
  defaults?: boolean
  force?: boolean
}

export default abstract class AppCommand extends Base {
  static flags: flags.Input = {
    defaults: flags.boolean({description: 'use defaults for every setting'}),
    force: flags.boolean({description: 'overwrite existing files'}),
  }
  static args = [
    {name: 'name', description: 'name of command', required: true}
  ]

  async run() {
    await super.generate('command', {
      name: this.args.name,
      defaults: this.flags.defaults,
      force: this.flags.force
    })
  }
}
