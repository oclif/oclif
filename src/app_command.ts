import {flags, parse} from '@anycli/command'

import Base from './command_base'

export default abstract class AppCommand extends Base {
  static flags = {
    defaults: flags.boolean({description: 'use defaults for every setting'}),
    options: flags.string({description: '(typescript|semantic-release|mocha)'}),
    force: flags.boolean({description: 'overwrite existing files'}),
  }
  static args = [
    {name: 'path', required: false}
  ]

  options = parse(this.argv, AppCommand)
  abstract type: string

  async run() {
    const options = this.options.flags.options ? this.options.flags.options.split(',') : []

    await super.generate('app', {
      type: this.type,
      path: this.options.args.path,
      options,
      defaults: this.options.flags.defaults,
      force: this.options.flags.force
    })
  }
}
