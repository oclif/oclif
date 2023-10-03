import {Args, Flags} from '@oclif/core'

import CommandBase from './../command-base'

export default class Generate extends CommandBase {
  static args = {
    name: Args.string({description: 'directory name of new project', required: true}),
  }

  static description = `generate a new CLI
This will clone the template repo 'oclif/hello-world' and update package properties`

  static flags = {
    defaults: Flags.boolean({hidden: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Generate)

    await super.generate('cli', {
      defaults: flags.defaults,
      force: true,
      name: args.name,
    })
  }
}
