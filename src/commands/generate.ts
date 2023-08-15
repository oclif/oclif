import {Args, Command} from '@oclif/core'
import {generate} from '../util'

export default class Generate extends Command {
  static description = `generate a new CLI
This will clone the template repo 'oclif/hello-world' and update package properties`

  static flags = {}

  static args = {
    name: Args.string({required: true, description: 'directory name of new project'}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(Generate)

    await generate('cli', {
      name: args.name,
      force: true,
    })
  }
}
