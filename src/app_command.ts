import {flags} from '@dxcli/command'

import Base from './command_base'

export default abstract class AppCommand extends Base {
  static flags: flags.Input<AppCommand['flags']> = {
    defaults: flags.boolean({description: 'use defaults for every setting'}),
    options: flags.string({description: '(typescript|semantic-release|mocha)'}),
    force: flags.boolean({description: 'overwrite existing files'}),
  }
  static args = [
    {name: 'path', required: false}
  ]
  flags: {
    defaults?: boolean
    options?: string
    force?: boolean
  }

  abstract type: string

  async run() {
    const options = this.flags.options ? this.flags.options.split(',') : []

    await super.generate('app', {
      type: this.type,
      path: this.args.path,
      options,
      defaults: this.flags.defaults,
      force: this.flags.force
    })
  }
}
